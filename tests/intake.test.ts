import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyIntake,
  exampleStory,
  hasSensitiveData,
  immediateDanger,
  localIntake,
  validateIntake,
} from "../lib/intake";
import { interpretStory } from "../lib/intake-provider";

test("free text becomes facts and shelter comes before paperwork", () => {
  const context = localIntake(exampleStory);
  assert.equal(context.disaster, "Flood");
  assert.equal(context.location, "Fairfax County, VA");
  assert.equal(context.safety, "safe");
  assert.equal(context.housing, "Cannot stay at home");
  assert.equal(context.tenure, "Renter");
  assert.equal(context.children, "Mentioned");
  assert.equal(context.pets, "Mentioned");
  assert.equal(context.insurance, "Unknown");
  assert.equal(context.priority, "shelter");
});
test("Korean survivor statement is recognized conservatively", () => {
  const context = localIntake(
    "나 지금 홍수가 나서 집이 없어졌는데 어디에 어떻게 뭘 신청해야할지 모르겠어",
  );
  assert.equal(context.disaster, "Flood");
  assert.equal(context.housing, "Cannot stay at home");
  assert.equal(context.location, null);
  assert.equal(context.safety, "unknown");
  assert.equal(context.priority, "safety");
});
test("no default renter, child, pet, location or disaster is invented", () => {
  const context = localIntake("Please help me work out what to do.");
  assert.equal(context.tenure, "Unknown");
  assert.equal(context.pets, "Not mentioned");
  assert.equal(context.children, "Not mentioned");
  assert.equal(context.location, null);
  assert.equal(context.disaster, "Unknown");
});
test("urgent language overrides a contradictory safe claim", () => {
  const context = localIntake("I am safe but trapped and water is rising.");
  assert.equal(context.safety, "danger");
  assert.equal(context.priority, "safety");
  assert.ok(immediateDanger("홍수 때문에 집에 갇혔어요."));
  assert.equal(immediateDanger("I am not trapped. I am safe now."), null);
  assert.ok(immediateDanger("I am not trapped and I can't breathe"));
  assert.equal(
    immediateDanger("I was trapped yesterday but I am safe now."),
    null,
  );
});
test("insurance negation and unknown coverage are retained", () => {
  assert.equal(localIntake("I do not have insurance").insurance, "No");
  assert.equal(
    localIntake("I am not sure if the damage is covered by insurance")
      .insurance,
    "Not sure",
  );
});
test("unverifiable model evidence is rejected and unsupported fields cleared", () => {
  assert.throws(() =>
    validateIntake(
      {
        ...emptyIntake,
        location: "Fairfax",
        evidence: [{ field: "location", quote: "invented quote" }],
      },
      "My house flooded",
    ),
  );
  const context = validateIntake(
    { ...emptyIntake, location: "Fairfax", tenure: "Renter" },
    "My house flooded",
  );
  assert.equal(context.location, null);
  assert.equal(context.tenure, "Unknown");
});
test("sensitive numbers are blocked before provider transmission", () => {
  assert.equal(hasSensitiveData("My SSN is 123-45-6789"), true);
  assert.equal(hasSensitiveData("password: secret-value"), true);
  assert.equal(
    hasSensitiveData("I live in Fairfax and have two children."),
    false,
  );
});
test("Foundry intake uses exact evidence and graceful failures", async () => {
  const previousFetch = globalThis.fetch;
  const env = { ...process.env };
  process.env.AZURE_FOUNDRY_ENDPOINT = "https://test.openai.azure.com";
  process.env.AZURE_FOUNDRY_API_KEY = "test";
  process.env.AZURE_FOUNDRY_DEPLOYMENT = "intake-model";
  try {
    globalThis.fetch = async (_url, init) => {
      const body = JSON.parse(init?.body as string);
      assert.equal(body.response_format.json_schema.strict, true);
      return Response.json({
        choices: [
          { message: { content: JSON.stringify(localIntake(exampleStory)) } },
        ],
      });
    };
    const result = await interpretStory(exampleStory);
    assert.equal(result.provider, "foundry");
    assert.equal(result.context.priority, "shelter");
    globalThis.fetch = async () => {
      throw new Error("Offline");
    };
    assert.equal((await interpretStory(exampleStory)).provider, "local");
    globalThis.fetch = async () =>
      Response.json({ choices: [{ message: { content: "{}" } }] });
    assert.equal((await interpretStory(exampleStory)).provider, "local");
  } finally {
    globalThis.fetch = previousFetch;
    process.env = env;
  }
});
