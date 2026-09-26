import { z } from "zod";
export const phaseSchema = z.enum([
  "calm",
  "alert",
  "assistance",
  "prepare",
  "review",
  "recovery",
]);
export type Phase = z.infer<typeof phaseSchema>;
export const householdSchema = z
  .object({
    tenure: z.enum(["Renter", "Homeowner"]),
    child: z.boolean(),
    pet: z.boolean(),
    housing: z.enum([
      "Not reported",
      "Temporarily uninhabitable",
      "Safe to occupy",
    ]),
    vehicle: z.enum(["Not reported", "Damaged", "No damage"]),
    insurance: z.enum(["Not answered", "Yes", "No", "Not sure"]),
  })
  .strict();
export type Household = z.infer<typeof householdSchema>;
export const defaultHousehold: Household = {
  tenure: "Renter",
  child: true,
  pet: true,
  housing: "Not reported",
  vehicle: "Not reported",
  insurance: "Not answered",
};
export const sources = {
  nws: {
    name: "National Weather Service",
    url: "https://www.weather.gov/safety/flood-during",
    note: "Official flood safety guidance",
  },
  fema: {
    name: "FEMA Individual Assistance",
    url: "https://www.fema.gov/assistance/individual",
    note: "Official program information; individual eligibility is determined by FEMA",
  },
  declarations: {
    name: "OpenFEMA",
    url: "https://www.fema.gov/openfema-data-page/disaster-declarations-summaries-v2",
    note: "Disaster Declarations Summaries v2",
  },
  apply: {
    name: "DisasterAssistance.gov",
    url: "https://www.disasterassistance.gov/",
    note: "Official assistance application website",
  },
};
export const actions = {
  safety: {
    title: "Get to a safe place",
    description:
      "Move to higher ground if needed. Follow local emergency instructions and keep your household together.",
    icon: "shield",
    source: "nws",
  },
  roads: {
    title: "Avoid flooded roads",
    description:
      "Never walk or drive through floodwater. Choose a safe route away from flooded areas.",
    icon: "route",
    source: "nws",
  },
  essentials: {
    title: "Keep your essentials close",
    description:
      "Bring medications, water, a phone charger, and essential documents if safe to do so.",
    icon: "bag",
    source: "nws",
  },
  document: {
    title: "Document the damage",
    description:
      "When it is safe, take photos of your home, belongings, and vehicle. Keep receipts for essential expenses.",
    icon: "camera",
    source: "fema",
  },
  insurance: {
    title: "Check your insurance coverage",
    description:
      "Contact your insurer about disaster damage. Keep your claim information for your assistance review.",
    icon: "file",
    source: "fema",
  },
  assistance: {
    title: "Review available assistance",
    description:
      "Explore the program information and prepare your next step. FEMA determines eligibility after review.",
    icon: "heart",
    source: "fema",
  },
} as const;
export type ActionId = keyof typeof actions;
export const reasoningSchema = z
  .object({
    summary: z.string().min(1).max(260),
    recommendedActions: z
      .array(
        z.enum([
          "safety",
          "roads",
          "essentials",
          "document",
          "insurance",
          "assistance",
        ]),
      )
      .length(3),
    explanation: z.string().min(1).max(400),
    missingInformation: z.array(z.enum(["insurance"])).max(1),
    requiresHumanEscalation: z.boolean(),
  })
  .strict();
export type Reasoning = z.infer<typeof reasoningSchema>;
export type Plan = Reasoning & {
  provider: "foundry" | "demo";
  providerNote: string;
  generatedAt: string;
  elapsedMs: number;
};
export function fallbackReasoning(
  phase: Phase,
  household: Household,
): Reasoning {
  const urgent = phase === "alert";
  return {
    summary: urgent
      ? "Your safety comes first. Three small steps can help protect your household."
      : "You focus on your household. We’ll help organize what comes next.",
    recommendedActions: urgent
      ? ["safety", "roads", "essentials"]
      : ["document", "insurance", "assistance"],
    explanation: urgent
      ? `This simulated flood warning affects Fairfax County. Your plan considers your ${household.child ? "child" : "household"}${household.pet ? " and dog" : ""}, so safety and essential supplies come first.`
      : "In this fictional scenario, Fairfax County is designated for Individual Assistance. Your household context helps organize the next steps. Review your reported needs before continuing. FEMA determines eligibility.",
    missingInformation:
      household.insurance === "Not answered" ? ["insurance"] : [],
    requiresHumanEscalation: false,
  };
}
export function createApplication(household: Household) {
  return {
    Disaster: "Flash flooding · simulated event",
    Location: "Fairfax County, Virginia",
    "Housing tenure": household.tenure,
    "Housing condition": household.housing,
    "Vehicle damage": household.vehicle,
    Insurance: household.insurance,
  };
}
export function validateReasoning(
  value: unknown,
  phase: Phase,
  household: Household,
): Reasoning {
  const result = reasoningSchema.parse(value);
  if (new Set(result.recommendedActions).size !== 3)
    throw new Error("Duplicate actions");
  const expected =
    phase === "alert"
      ? ["safety", "roads", "essentials"]
      : ["document", "insurance", "assistance"];
  if (result.recommendedActions.some((id) => !expected.includes(id)))
    throw new Error("Actions outside phase");
  if (phase === "alert" && result.recommendedActions[0] !== "safety")
    throw new Error("Safety must be first");
  if (
    /\b(you qualify|guaranteed|approved for|eligible for|deadline|\$\d)/i.test(
      `${result.summary} ${result.explanation}`,
    )
  )
    throw new Error("Unsupported consequential claim");
  // Missing fields are computed from known facts, never delegated to model inference.
  return {
    ...result,
    missingInformation:
      household.insurance === "Not answered" ? ["insurance"] : [],
  };
}
