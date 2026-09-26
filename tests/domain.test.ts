import test from "node:test";
import assert from "node:assert/strict";
import {
  createApplication,
  defaultHousehold,
  fallbackReasoning,
  validateReasoning,
} from "../lib/domain";
import { generatePlan } from "../lib/foundry";
import { getTrustedData } from "../lib/trusted-data";

test("crisis puts safety first and asks only for unknown insurance", () => {
  const result = fallbackReasoning("alert", defaultHousehold);
  assert.deepEqual(result.recommendedActions, [
    "safety",
    "roads",
    "essentials",
  ]);
  assert.deepEqual(result.missingInformation, ["insurance"]);
  assert.deepEqual(
    fallbackReasoning("prepare", { ...defaultHousehold, insurance: "No" })
      .missingInformation,
    [],
  );
});
test("application preserves edited facts without asserting eligibility", () => {
  const application = createApplication({
    ...defaultHousehold,
    tenure: "Homeowner",
    insurance: "Not sure",
  });
  assert.equal(application["Housing tenure"], "Homeowner");
  assert.equal(application.Insurance, "Not sure");
  assert.match(application.Disaster, /simulated/);
  assert.equal("Eligibility" in application, false);
});
test("rejects hallucinated eligibility, unsafe priority, duplicate and wrong-phase actions", () => {
  const base = fallbackReasoning("alert", defaultHousehold);
  for (const change of [
    { summary: "You qualify for assistance." },
    { recommendedActions: ["roads", "safety", "essentials"] },
    { recommendedActions: ["safety", "safety", "roads"] },
    { recommendedActions: ["safety", "document", "roads"] },
  ]) {
    assert.throws(() =>
      validateReasoning({ ...base, ...change }, "alert", defaultHousehold),
    );
  }
});
test("deterministic provider never needs credentials or network", async () => {
  const plan = await generatePlan("alert", defaultHousehold, true);
  assert.equal(plan.provider, "demo");
  assert.deepEqual(plan.recommendedActions, ["safety", "roads", "essentials"]);
});
test("Foundry request uses structured outputs; validated output reaches the plan", async () => {
  const originalFetch = globalThis.fetch;
  const previous = { ...process.env };
  process.env.AZURE_FOUNDRY_ENDPOINT = "https://test.openai.azure.com";
  process.env.AZURE_FOUNDRY_API_KEY = "test-key";
  process.env.AZURE_FOUNDRY_DEPLOYMENT = "test-deployment";
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(
        url,
        "https://test.openai.azure.com/openai/v1/chat/completions",
      );
      const body = JSON.parse(options?.body as string);
      assert.equal(body.response_format.json_schema.strict, true);
      assert.equal(body.model, "test-deployment");
      return Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify(
                fallbackReasoning("alert", defaultHousehold),
              ),
            },
          },
        ],
      });
    };
    assert.equal(
      (await generatePlan("alert", defaultHousehold)).provider,
      "foundry",
    );
    globalThis.fetch = async () =>
      Response.json({ choices: [{ message: { content: "{invalid}" } }] });
    assert.equal(
      (await generatePlan("alert", defaultHousehold)).provider,
      "demo",
    );
    globalThis.fetch = async () => {
      throw new Error("Network failure");
    };
    assert.equal(
      (await generatePlan("alert", defaultHousehold)).provider,
      "demo",
    );
  } finally {
    globalThis.fetch = originalFetch;
    process.env = previous;
  }
});
test("source outages never appear as live data or an all-clear", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => {
      throw new Error("Offline");
    };
    const result = await getTrustedData();
    assert.equal(result.weather.mode, "unavailable");
    assert.equal(result.declarations.mode, "unavailable");
    assert.deepEqual(result.weather.items, []);
    assert.match(result.weather.message, /unknown/);
  } finally {
    globalThis.fetch = original;
  }
});
test("live adapters preserve declaration designation and source timestamps", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url) =>
      String(url).includes("weather.gov")
        ? Response.json({
            features: [
              {
                id: "alert-1",
                properties: {
                  event: "Flash Flood Warning",
                  headline: "Example",
                  sent: "2026-09-25T12:00:00Z",
                  expires: null,
                  severity: "Severe",
                },
              },
            ],
          })
        : Response.json({
            DisasterDeclarationsSummaries: [
              {
                disasterNumber: 1,
                declarationTitle: "Test only",
                declarationDate: "2020-01-01T00:00:00Z",
                designatedArea: "Fairfax (County)",
                iaProgramDeclared: false,
              },
            ],
          });
    const result = await getTrustedData();
    assert.equal(result.weather.mode, "live");
    assert.equal(result.weather.items[0].issuedAt, "2026-09-25T12:00:00Z");
    assert.equal(result.declarations.items[0].iaProgramDeclared, false);
    assert.match(result.declarations.message, /Historical/);
  } finally {
    globalThis.fetch = original;
  }
});
