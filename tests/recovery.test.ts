import test from "node:test";
import assert from "node:assert/strict";
import {
  actionCatalog,
  applyEvent,
  compileDeterministically,
  createInitialTwin,
  prepareApplication,
} from "../lib/recovery";
import { evaluateDemoRoutes } from "../lib/route-risk";
import { compileEvent } from "../lib/crisis-compiler";
import { POST as submitDemoApplication } from "../app/api/demo-government/application/route";

const event = <
  T extends
    | "FLASH_FLOOD_WARNING"
    | "HOME_FLOODED"
    | "FEMA_ASSISTANCE_DECLARED"
    | "RECOVERY_CENTER_OPENED"
    | "DOCUMENT_REQUESTED",
>(
  type: T,
) =>
  ({
    id: `${type}-test`,
    type,
    occurredAt: "2026-09-25T18:00:00.000Z",
  }) as const;

test("Recovery Twin starts calm with no fabricated assistance", () => {
  const twin = createInitialTwin();
  assert.equal(twin.disaster.severity, "low");
  assert.equal(twin.assistance.individualAssistanceAvailable, false);
  assert.equal(twin.applications[0].status, "not_started");
});

test("events mutate the twin and recompute the next best action", () => {
  let twin = createInitialTwin();
  twin = applyEvent(twin, event("FLASH_FLOOD_WARNING")).twin;
  assert.equal(twin.disaster.severity, "high");
  assert.equal(compileDeterministically(twin).nextBestActionId, "move-higher");
  twin = applyEvent(twin, event("HOME_FLOODED")).twin;
  assert.equal(
    compileDeterministically(twin).nextBestActionId,
    "risk-aware-route",
  );
  const declaration = applyEvent(twin, event("FEMA_ASSISTANCE_DECLARED"));
  assert.equal(declaration.twin.assistance.individualAssistanceAvailable, true);
  assert.ok(
    declaration.changes.some(
      (change) => change.field === "assistance.individualAssistanceAvailable",
    ),
  );
  assert.equal(actionCatalog(declaration.twin)[0].id, "review-assistance");
});

test("application preparation maps known facts and stops on one missing field", () => {
  let twin = applyEvent(createInitialTwin(), event("FLASH_FLOOD_WARNING")).twin;
  twin = applyEvent(twin, event("HOME_FLOODED")).twin;
  const incomplete = prepareApplication(twin);
  assert.deepEqual(incomplete.missingFields, ["insuranceCoverage"]);
  assert.equal(incomplete.readyForReview, false);
  const complete = prepareApplication(twin, "Not sure");
  assert.equal(complete.readyForReview, true);
  assert.equal(
    complete.fields.find((field) => field.key === "insuranceCoverage")?.source,
    "user",
  );
});

test("route risk is computed geometrically", () => {
  const routes = evaluateDemoRoutes();
  assert.equal(
    routes.find((route) => route.id === "fastest")?.intersectsHazard,
    true,
  );
  assert.equal(
    routes.find((route) => route.id === "alternative")?.intersectsHazard,
    false,
  );
});

test("deterministic compiler remains available without credentials", async () => {
  const twin = createInitialTwin();
  const result = await compileEvent(twin, event("FLASH_FLOOD_WARNING"), true);
  assert.equal(result.provider, "deterministic");
  assert.equal(result.inferenceMode, "fallback");
  assert.equal(result.nextBestActionId, "move-higher");
  assert.equal(result.stateChanges[0].previousValue, "low");
  assert.equal(result.stateChanges[0].nextValue, "high");
});

test("Crisis Compiler accepts a validated Microsoft Foundry structured result", async () => {
  const originalFetch = globalThis.fetch;
  const originalEndpoint = process.env.AZURE_FOUNDRY_ENDPOINT;
  const originalKey = process.env.AZURE_FOUNDRY_API_KEY;
  const originalDeployment = process.env.AZURE_FOUNDRY_DEPLOYMENT;
  let requestBody: any;
  process.env.AZURE_FOUNDRY_ENDPOINT = "https://demo.openai.azure.com";
  process.env.AZURE_FOUNDRY_API_KEY = "test-key";
  process.env.AZURE_FOUNDRY_DEPLOYMENT = "gpt-4.1-mini-demo";
  globalThis.fetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body));
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                urgency: "high",
                prioritizedActionIds: [
                  "move-higher",
                  "avoid-roads",
                  "prepare-household",
                ],
                nextBestActionId: "move-higher",
                explanation: "Safety actions follow the supplied warning.",
                requiresHumanEscalation: false,
              }),
            },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };
  try {
    const result = await compileEvent(
      createInitialTwin(),
      event("FLASH_FLOOD_WARNING"),
    );
    assert.equal(result.provider, "foundry");
    assert.equal(result.providerModel, "gpt-4.1-mini-demo");
    assert.equal(result.inferenceMode, "live");
    assert.equal(result.nextBestActionId, "move-higher");
    assert.equal(requestBody.response_format.type, "json_schema");
    assert.equal(requestBody.response_format.json_schema.strict, true);
    assert.deepEqual(
      requestBody.response_format.json_schema.schema.properties.urgency.enum,
      ["high"],
    );
    assert.deepEqual(
      requestBody.response_format.json_schema.schema.properties.nextBestActionId
        .enum,
      ["move-higher"],
    );
    assert.equal(
      requestBody.response_format.json_schema.schema.properties.explanation
        .maxLength,
      300,
    );
    const supplied = JSON.parse(requestBody.messages[1].content);
    assert.equal(
      supplied.trustedFacts[0].sourceName,
      "National Weather Service",
    );
    assert.equal(supplied.stateChanges[0].field, "disaster.severity");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalEndpoint === undefined)
      delete process.env.AZURE_FOUNDRY_ENDPOINT;
    else process.env.AZURE_FOUNDRY_ENDPOINT = originalEndpoint;
    if (originalKey === undefined) delete process.env.AZURE_FOUNDRY_API_KEY;
    else process.env.AZURE_FOUNDRY_API_KEY = originalKey;
    if (originalDeployment === undefined)
      delete process.env.AZURE_FOUNDRY_DEPLOYMENT;
    else process.env.AZURE_FOUNDRY_DEPLOYMENT = originalDeployment;
  }
});

test("submission and document request use the same event-state-decision loop", () => {
  let twin = createInitialTwin();
  twin.applications[0].status = "ready_for_review";
  twin = applyEvent(twin, {
    id: "submitted-test",
    type: "APPLICATION_SUBMITTED",
    occurredAt: "2026-09-25T18:00:00.000Z",
    applicationId: "DEMO-2026-TEST",
  }).twin;
  assert.equal(twin.applications[0].status, "under_review");
  const requested = applyEvent(twin, event("DOCUMENT_REQUESTED"));
  assert.equal(requested.twin.applications[0].status, "action_required");
  assert.equal(actionCatalog(requested.twin)[0].id, "proof-occupancy");
  assert.equal(requested.changes[0].previousValue, "under_review");
});

test("simulated portal enforces approval on the server and returns its own ID", async () => {
  const draft = prepareApplication(
    applyEvent(
      applyEvent(createInitialTwin(), event("FLASH_FLOOD_WARNING")).twin,
      event("HOME_FLOODED"),
    ).twin,
    "Yes",
  );
  const request = (approved: boolean) =>
    new Request("http://localhost/api/demo-government/application", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draft,
        approval: {
          approved,
          approvedAt: "2026-09-25T18:00:00.000Z",
        },
      }),
    });
  assert.equal((await submitDemoApplication(request(false))).status, 400);
  const accepted = await submitDemoApplication(request(true));
  assert.equal(accepted.status, 200);
  const receipt = await accepted.json();
  assert.match(receipt.applicationId, /^DEMO-2026-/);
  assert.equal(receipt.simulated, true);
});
