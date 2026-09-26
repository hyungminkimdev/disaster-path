import { z } from "zod";

export const intakeSchema = z
  .object({
    disaster: z.enum(["Flood", "Fire", "Storm", "Other", "Unknown"]),
    location: z.string().max(100).nullable(),
    safety: z.enum(["safe", "danger", "unknown"]),
    housing: z.enum(["Cannot stay at home", "Can stay at home", "Unknown"]),
    tenure: z.enum(["Renter", "Homeowner", "Unknown"]),
    insurance: z.enum(["Yes", "No", "Not sure", "Unknown"]),
    children: z.enum(["Mentioned", "Not mentioned"]),
    pets: z.enum(["Mentioned", "Not mentioned"]),
    priority: z.enum(["safety", "shelter", "assistance"]),
    evidence: z
      .array(
        z
          .object({
            field: z.enum([
              "disaster",
              "location",
              "safety",
              "housing",
              "tenure",
              "insurance",
              "children",
              "pets",
            ]),
            quote: z.string().min(1).max(180),
          })
          .strict(),
      )
      .max(8),
  })
  .strict();
export type Intake = z.infer<typeof intakeSchema>;
export type IntakeResult = {
  context: Intake;
  provider: "foundry" | "local";
  note: string;
  generatedAt: string;
};
export const emptyIntake: Intake = {
  disaster: "Unknown",
  location: null,
  safety: "unknown",
  housing: "Unknown",
  tenure: "Unknown",
  insurance: "Unknown",
  children: "Not mentioned",
  pets: "Not mentioned",
  priority: "safety",
  evidence: [],
};
export const exampleStory =
  "The flood damaged my rented home in Fairfax County, VA. I’m safe now, but I can’t stay at home. I’m with my daughter and our dog. I don’t know where to start.";
export const shelterSource = {
  name: "American Red Cross",
  url: "https://www.redcross.org/get-help/disaster-relief-and-recovery-services/find-an-open-shelter.html",
};

// Local extraction is deliberately conservative. Unrecognized or conflicting statements
// stay unknown and are confirmed by the person before use. It is not an AI diagnosis.
export function localIntake(text: string): Intake {
  const result: Intake = { ...emptyIntake, evidence: [] };
  function match(
    field: Intake["evidence"][number]["field"],
    value: string,
    pattern: RegExp,
  ) {
    const found = text.match(pattern);
    if (found) {
      Object.assign(result, { [field]: value });
      result.evidence.push({ field, quote: found[0].slice(0, 180) });
    }
  }
  match("disaster", "Flood", /\b(?:flood(?:ed|ing)?|flash flood)\b|홍수|침수/i);
  if (result.disaster === "Unknown")
    match(
      "disaster",
      "Fire",
      /\b(?:wildfire|house fire|fire destroyed)\b|산불|화재/i,
    );
  if (result.disaster === "Unknown")
    match("disaster", "Storm", /\b(?:hurricane|tornado|storm)\b|태풍|폭풍/i);
  match(
    "location",
    "Fairfax County, VA",
    /Fairfax(?: County)?(?:,? (?:VA|Virginia))?|페어팩스(?: 카운티)?/i,
  );
  if (!result.location) {
    const location = text.match(
      /\b(?:in|from) ((?:Richmond|Arlington|Norfolk|Roanoke|Alexandria|Virginia Beach)(?:,? (?:VA|Virginia))?)/i,
    );
    if (location) {
      result.location = location[1];
      result.evidence.push({ field: "location", quote: location[1] });
    }
  }
  match(
    "safety",
    "safe",
    /\b(?:I(?:['’]m| am)|we(?:['’]re| are)) (?:all |currently )?safe(?: now)?\b|지금은? 안전(?:해|한|하)|안전한 곳에/i,
  );
  match(
    "housing",
    "Can stay at home",
    /\b(?:can stay (?:at )?home|home is (?:safe|habitable))\b|집은 안전/i,
  );
  match(
    "housing",
    "Cannot stay at home",
    /\b(?:can(?:not|['’]t) (?:stay|live|return) (?:at |in |to )?(?:my |our )?(?:home|house)|(?:home|house|apartment) (?:is |was |has been )?(?:gone|destroyed|flooded|uninhabitable)|lost (?:my|our) (?:home|house)|nowhere to (?:stay|sleep)|need (?:a )?(?:shelter|place to stay))\b|집[이가을]?\s*(?:없어|떠내려|무너|침수)|갈 곳[이가]? 없|잘 곳[이가]? 없|집에 (?:못|머물 수 없)/i,
  );
  match(
    "tenure",
    "Renter",
    /\b(?:rented (?:home|house|apartment)|rent(?:ing)? (?:my|our|a|an|the)|renter|tenant)\b|세입자|월세|전세/i,
  );
  match("tenure", "Homeowner", /\b(?:I own|we own|homeowner)\b|자가|집주인/i);
  match(
    "insurance",
    "Yes",
    /\b(?:I have|we have|I['’]m covered by) (?:flood |home |renters?['’]? )?insurance\b|보험[이가]? 있/i,
  );
  match(
    "insurance",
    "No",
    /\b(?:no insurance|uninsured|(?:don['’]t|do not) have (?:\w+ )?insurance)\b|보험[이가]? 없/i,
  );
  match(
    "insurance",
    "Not sure",
    /\b(?:not sure|don['’]t know|do not know)[^.?!]{0,45}\b(?:insurance|covered)\b|보험[^.?!]{0,20}모르/i,
  );
  match(
    "children",
    "Mentioned",
    /\b(?:my|our) (?:child|children|daughter|son|baby|kids)\b|아이와|아이랑|아이가|딸과|아들과/i,
  );
  match(
    "pets",
    "Mentioned",
    /\b(?:my|our) (?:dog|cat|pet)\b|강아지|반려견|반려동물|고양이/i,
  );
  const danger = immediateDanger(text);
  if (danger) {
    result.safety = "danger";
    result.evidence = result.evidence.filter((e) => e.field !== "safety");
    result.evidence.push({ field: "safety", quote: danger });
  }
  result.priority =
    result.safety !== "safe"
      ? "safety"
      : result.housing === "Cannot stay at home"
        ? "shelter"
        : "assistance";
  // More than one positive match for a field is collapsed to the last result.
  result.evidence = result.evidence.filter(
    (e, i, list) => list.findLastIndex((x) => x.field === e.field) === i,
  );
  return result;
}
export function immediateDanger(text: string): string | null {
  const clauses = text.split(/[.!?\n]|\bbut\b|하지만/i);
  const dangerPattern =
    /\b(?:trapped|drowning|can(?:not|['’]t) breathe|seriously injured|heavy bleeding|water is rising|house is on fire|in immediate danger|not safe)\b|갇혔|갇혀|숨[을이]?\s*(?:못|안)|물이 (?:계속 )?차오|불이 났|안전하지 않/gi;
  for (const clause of clauses) {
    for (const match of clause.matchAll(dangerPattern)) {
      const before = clause.slice(0, match.index).slice(-45);
      const negated =
        /\b(?:not|no longer|aren['’]t|isn['’]t)\s*(?:currently\s*)?$/i.test(
          before,
        );
      const clearlyPast =
        /\b(?:was|were|used to be)\s*$/i.test(before) &&
        /\b(?:safe now|now safe|safe right now)\b|지금은 안전/i.test(text);
      if (!negated && !clearlyPast) return match[0];
    }
  }
  return null;
}

export function validateIntake(value: unknown, text: string): Intake {
  const parsed = intakeSchema.parse(value);
  for (const item of parsed.evidence)
    if (!text.includes(item.quote))
      throw new Error("Evidence is not in the survivor statement");
  const fields = [
    "disaster",
    "location",
    "safety",
    "housing",
    "tenure",
    "insurance",
    "children",
    "pets",
  ] as const;
  const verified = { ...parsed };
  // A model cannot populate a field without an exact supporting quote. Unknown is safe.
  for (const field of fields)
    if (!parsed.evidence.some((e) => e.field === field))
      Object.assign(verified, { [field]: emptyIntake[field] });
  const danger = immediateDanger(text);
  if (danger) verified.safety = "danger";
  verified.priority =
    verified.safety !== "safe"
      ? "safety"
      : verified.housing === "Cannot stay at home"
        ? "shelter"
        : "assistance";
  return verified;
}
export function hasSensitiveData(text: string) {
  return /\b\d{3}[- ]\d{2}[- ]\d{4}\b|\b(?:\d[ -]?){13,19}\b|\b(?:password|bank account|social security|ssn)\s*[:=]\s*\S+/i.test(
    text,
  );
}
export function contextFields(context: Intake) {
  return {
    Disaster:
      context.disaster === "Unknown" ? "Not provided" : context.disaster,
    Location: context.location || "Not provided",
    Housing: context.housing === "Unknown" ? "Not provided" : context.housing,
    "Housing tenure":
      context.tenure === "Unknown" ? "Not provided" : context.tenure,
    Insurance:
      context.insurance === "Unknown" ? "Not provided" : context.insurance,
  };
}
