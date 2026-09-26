import { z } from "zod";

export type Urgency = "low" | "medium" | "high" | "critical";
export type ApplicationStatus =
  | "not_started"
  | "preparing"
  | "ready_for_review"
  | "approved"
  | "submitted"
  | "under_review"
  | "action_required"
  | "completed";

export type TrustedFact = {
  id: string;
  type:
    | "weather_alert"
    | "fema_declaration"
    | "recovery_center"
    | "official_guidance"
    | "application_update";
  sourceName: string;
  sourceUrl?: string;
  retrievedAt: string;
  simulated: boolean;
  summary: string;
  data: Record<string, unknown>;
};

export type RecoveryAction = {
  id: string;
  title: string;
  description: string;
  category:
    | "safety"
    | "shelter"
    | "medical"
    | "transportation"
    | "assistance"
    | "documents"
    | "recovery";
  priority: number;
  sourceIds: string[];
  requiresApproval: boolean;
  completed: boolean;
};

export type RecoveryApplication = {
  id: string;
  program: string;
  status: ApplicationStatus;
  missingFields: string[];
  externalId?: string;
  submittedAt?: string;
};

export type RecoveryEvent = {
  id: string;
  kind:
    | "weather_alert"
    | "user_update"
    | "fema_declaration"
    | "recovery_center"
    | "application_status";
  title: string;
  detail: string;
  occurredAt: string;
  simulated: boolean;
  sourceLabel: string;
  stateChanges: StateChange[];
  decision?: string;
  twinVersion: number;
};

export type RecoveryTwin = {
  version: number;
  mode: "demo" | "live";
  household: {
    adults: number;
    children: number;
    pets: string[];
    language: string;
  };
  location: {
    county: string;
    state: string;
    latitude: number;
    longitude: number;
  };
  disaster: {
    type: string;
    severity: Urgency;
    activeAlertId?: string;
    source?: string;
  };
  housing: {
    status: "safe" | "damaged" | "uninhabitable" | "unknown";
    renterOrOwner: "renter" | "owner" | "unknown";
  };
  documents: {
    id: "available" | "lost" | "damaged" | "unknown";
    proofOfOccupancy: "available" | "needed" | "unknown";
  };
  immediateNeeds: {
    shelter: boolean;
    food: boolean;
    medical: boolean;
    transportation: boolean;
    petSupport: boolean;
  };
  assistance: {
    individualAssistanceAvailable: boolean;
    matchedPrograms: {
      id: string;
      name: string;
      reason: string;
      sourceIds: string[];
    }[];
  };
  applications: RecoveryApplication[];
  recoveryTasks: RecoveryAction[];
  nextBestAction?: RecoveryAction;
  facts: TrustedFact[];
  events: RecoveryEvent[];
  lastUpdated: string;
};

export type DisasterEvent =
  | { id: string; type: "FLASH_FLOOD_WARNING"; occurredAt: string }
  | { id: string; type: "HOME_FLOODED"; occurredAt: string }
  | { id: string; type: "FEMA_ASSISTANCE_DECLARED"; occurredAt: string }
  | { id: string; type: "RECOVERY_CENTER_OPENED"; occurredAt: string }
  | {
      id: string;
      type: "APPLICATION_SUBMITTED";
      occurredAt: string;
      applicationId: string;
    }
  | { id: string; type: "DOCUMENT_REQUESTED"; occurredAt: string };

export type StateChange = {
  field: string;
  previousValue: string;
  nextValue: string;
  reason: string;
};
export type CrisisCompilerResult = {
  twin: RecoveryTwin;
  urgency: Urgency;
  stateChanges: StateChange[];
  prioritizedActions: RecoveryAction[];
  nextBestActionId: string;
  requiresHumanEscalation: boolean;
  provider: "foundry" | "deterministic";
  providerModel?: string;
  inferenceMode: "live" | "fallback";
  providerNote: string;
};

export const compilerOutputSchema = z
  .object({
    urgency: z.enum(["low", "medium", "high", "critical"]),
    prioritizedActionIds: z.array(z.string()).min(1).max(3),
    nextBestActionId: z.string(),
    explanation: z.string().min(1).max(300),
    requiresHumanEscalation: z.boolean(),
  })
  .strict();

const now = () => new Date().toISOString();
export function createInitialTwin(): RecoveryTwin {
  return {
    version: 1,
    mode: "demo",
    household: { adults: 1, children: 1, pets: ["dog"], language: "English" },
    location: {
      county: "Fairfax County",
      state: "VA",
      latitude: 38.8462,
      longitude: -77.3064,
    },
    disaster: { type: "none", severity: "low" },
    housing: { status: "safe", renterOrOwner: "renter" },
    documents: { id: "available", proofOfOccupancy: "unknown" },
    immediateNeeds: {
      shelter: false,
      food: false,
      medical: false,
      transportation: false,
      petSupport: false,
    },
    assistance: { individualAssistanceAvailable: false, matchedPrograms: [] },
    applications: [
      {
        id: "fema-ia",
        program: "FEMA Individual Assistance",
        status: "not_started",
        missingFields: ["insuranceCoverage"],
      },
    ],
    recoveryTasks: [],
    facts: [],
    events: [
      {
        id: "ready",
        kind: "user_update",
        title: "Recovery profile ready",
        detail: "No current action needed.",
        occurredAt: now(),
        simulated: true,
        sourceLabel: "Survivor · demo profile",
        stateChanges: [],
        decision: "Stay ready",
        twinVersion: 1,
      },
    ],
    lastUpdated: now(),
  };
}

const sources = {
  nws: "https://www.weather.gov/safety/flood-during",
  fema: "https://www.fema.gov/assistance/individual",
  drc: "https://egateway.fema.gov/ESF6/DRCLocator",
};
function action(
  id: string,
  title: string,
  description: string,
  category: RecoveryAction["category"],
  priority: number,
  sourceIds: string[] = [],
  requiresApproval = false,
): RecoveryAction {
  return {
    id,
    title,
    description,
    category,
    priority,
    sourceIds,
    requiresApproval,
    completed: false,
  };
}
function eventRecord(
  event: DisasterEvent,
  title: string,
  detail: string,
): RecoveryEvent {
  const kinds: Record<DisasterEvent["type"], RecoveryEvent["kind"]> = {
    FLASH_FLOOD_WARNING: "weather_alert",
    HOME_FLOODED: "user_update",
    FEMA_ASSISTANCE_DECLARED: "fema_declaration",
    RECOVERY_CENTER_OPENED: "recovery_center",
    APPLICATION_SUBMITTED: "application_status",
    DOCUMENT_REQUESTED: "application_status",
  };
  const sourceLabels: Record<DisasterEvent["type"], string> = {
    FLASH_FLOOD_WARNING: "NWS · simulated event",
    HOME_FLOODED: "Survivor report · demo",
    FEMA_ASSISTANCE_DECLARED: "OpenFEMA · simulated event",
    RECOVERY_CENTER_OPENED: "FEMA DRC · simulated event",
    APPLICATION_SUBMITTED: "Simulated Government Portal",
    DOCUMENT_REQUESTED: "Simulated Government Portal",
  };
  return {
    id: event.id,
    kind: kinds[event.type],
    title,
    detail,
    occurredAt: event.occurredAt,
    simulated: true,
    sourceLabel: sourceLabels[event.type],
    stateChanges: [],
    twinVersion: 0,
  };
}
function fact(
  id: string,
  type: TrustedFact["type"],
  sourceName: string,
  sourceUrl: string,
  summary: string,
  data: Record<string, unknown>,
): TrustedFact {
  return {
    id,
    type,
    sourceName,
    sourceUrl,
    retrievedAt: now(),
    simulated: true,
    summary,
    data,
  };
}

export function applyEvent(
  current: RecoveryTwin,
  event: DisasterEvent,
): { twin: RecoveryTwin; changes: StateChange[] } {
  const twin: RecoveryTwin = structuredClone(current);
  const changes: StateChange[] = [];
  const change = (
    field: string,
    previousValue: unknown,
    nextValue: unknown,
    reason: string,
  ) => {
    if (String(previousValue) !== String(nextValue))
      changes.push({
        field,
        previousValue: String(previousValue),
        nextValue: String(nextValue),
        reason,
      });
  };
  if (event.type === "FLASH_FLOOD_WARNING") {
    change(
      "disaster.severity",
      twin.disaster.severity,
      "high",
      "Flash Flood Warning detected for the household area",
    );
    twin.disaster = {
      type: "flash_flood",
      severity: "high",
      activeAlertId: event.id,
      source: "National Weather Service",
    };
    const trusted = fact(
      event.id,
      "weather_alert",
      "National Weather Service",
      sources.nws,
      "Flash Flood Warning for the fictional Fairfax demo area",
      { severity: "Severe", geometry: "demo hazard polygon" },
    );
    twin.facts.push(trusted);
    twin.events.push(
      eventRecord(
        event,
        "Flash Flood Warning detected",
        "Recovery risk changed from LOW to HIGH.",
      ),
    );
  }
  if (event.type === "HOME_FLOODED") {
    change(
      "housing.status",
      twin.housing.status,
      "uninhabitable",
      "Household reported that the home flooded",
    );
    twin.housing.status = "uninhabitable";
    change(
      "immediateNeeds.shelter",
      twin.immediateNeeds.shelter,
      true,
      "The home is no longer habitable",
    );
    twin.immediateNeeds.shelter = true;
    twin.immediateNeeds.petSupport = twin.household.pets.length > 0;
    twin.events.push(
      eventRecord(
        event,
        "Home reported flooded",
        "Temporary shelter and pet support moved to the top of the plan.",
      ),
    );
  }
  if (event.type === "FEMA_ASSISTANCE_DECLARED") {
    change(
      "assistance.individualAssistanceAvailable",
      twin.assistance.individualAssistanceAvailable,
      true,
      "Individual Assistance added to the fictional county declaration",
    );
    twin.assistance.individualAssistanceAvailable = true;
    twin.assistance.matchedPrograms = [
      {
        id: "fema-ia",
        name: "FEMA Individual Assistance",
        reason:
          "The county and reported housing damage may make this program relevant. FEMA determines eligibility.",
        sourceIds: [event.id],
      },
    ];
    twin.facts.push(
      fact(
        event.id,
        "fema_declaration",
        "OpenFEMA",
        sources.fema,
        "Fictional Fairfax County Individual Assistance designation",
        { county: twin.location.county, iaProgramDeclared: true },
      ),
    );
    twin.events.push(
      eventRecord(
        event,
        "New assistance detected",
        "Individual Assistance changed from unavailable to available in this fictional scenario.",
      ),
    );
  }
  if (event.type === "RECOVERY_CENTER_OPENED") {
    twin.facts.push(
      fact(
        event.id,
        "recovery_center",
        "FEMA DRC Locator",
        sources.drc,
        "Fictional recovery center opened in Fairfax County",
        { name: "Fairfax Recovery Center", distanceMiles: 4.1 },
      ),
    );
    twin.events.push(
      eventRecord(
        event,
        "Recovery center opened",
        "An in-person help option was added to the recovery plan.",
      ),
    );
  }
  if (event.type === "APPLICATION_SUBMITTED") {
    const app = twin.applications.find((item) => item.id === "fema-ia")!;
    change(
      "applications.fema-ia.status",
      app.status,
      "submitted",
      "User approved a simulated portal submission",
    );
    Object.assign(app, {
      status: "submitted",
      externalId: event.applicationId,
      submittedAt: event.occurredAt,
      missingFields: [],
    });
    twin.events.push(
      eventRecord(
        event,
        "Demo application submitted",
        `${event.applicationId} was received by the simulated government portal.`,
      ),
    );
    change(
      "applications.fema-ia.status",
      app.status,
      "under_review",
      "The simulated portal started reviewing the received application",
    );
    app.status = "under_review";
    twin.events[twin.events.length - 1].detail =
      `${event.applicationId} was received and is now under review in the simulated portal.`;
  }
  if (event.type === "DOCUMENT_REQUESTED") {
    const app = twin.applications.find((item) => item.id === "fema-ia")!;
    change(
      "applications.fema-ia.status",
      app.status,
      "action_required",
      "Simulated portal requested proof of occupancy",
    );
    app.status = "action_required";
    app.missingFields = ["proofOfOccupancy"];
    twin.documents.proofOfOccupancy = "needed";
    twin.facts.push(
      fact(
        event.id,
        "application_update",
        "Simulated Government Portal",
        "/demo/government-portal",
        "Proof of occupancy requested; no deadline supplied",
        { requestedDocument: "proof of occupancy", deadline: null },
      ),
    );
    twin.events.push(
      eventRecord(
        event,
        "Additional document requested",
        "Proof of occupancy is needed. No deadline was stated in the demo notice.",
      ),
    );
  }
  twin.version += 1;
  twin.lastUpdated = event.occurredAt;
  const latestEvent = twin.events[twin.events.length - 1];
  latestEvent.stateChanges = changes;
  latestEvent.twinVersion = twin.version;
  return { twin, changes };
}

export function actionCatalog(twin: RecoveryTwin): RecoveryAction[] {
  const items: RecoveryAction[] = [];
  if (
    twin.disaster.severity === "high" ||
    twin.disaster.severity === "critical"
  ) {
    items.push(
      action(
        "move-higher",
        "Move to higher ground",
        "Follow local emergency instructions and move away from floodwater if needed.",
        "safety",
        1,
        [twin.disaster.activeAlertId!],
      ),
      action(
        "avoid-roads",
        "Avoid flooded roads",
        "Do not walk or drive through floodwater.",
        "transportation",
        2,
        [twin.disaster.activeAlertId!],
      ),
      action(
        "prepare-household",
        "Keep essentials close",
        "Bring medications, a charger, child essentials, and pet supplies if safe.",
        "safety",
        3,
        [twin.disaster.activeAlertId!],
      ),
    );
  }
  if (twin.immediateNeeds.shelter)
    items.unshift(
      action(
        "risk-aware-route",
        "Use the risk-aware shelter route",
        "The fastest candidate crosses the identified warning area. Review the alternative and follow official instructions.",
        "shelter",
        1,
        twin.facts.filter((f) => f.type === "weather_alert").map((f) => f.id),
      ),
    );
  if (
    twin.assistance.individualAssistanceAvailable &&
    twin.applications[0].status === "not_started"
  )
    items.unshift(
      action(
        "review-assistance",
        "Review newly available assistance",
        "Individual Assistance may be relevant. Review the match before preparing a draft.",
        "assistance",
        1,
        twin.assistance.matchedPrograms[0]?.sourceIds || [],
        true,
      ),
    );
  if (
    twin.applications[0].status === "submitted" ||
    twin.applications[0].status === "under_review"
  )
    items.unshift(
      action(
        "document-damage",
        "Document remaining damage",
        "When safe, photograph damage and keep receipts while the simulated application is submitted.",
        "documents",
        1,
        [],
      ),
    );
  if (twin.applications[0].status === "action_required")
    items.unshift(
      action(
        "proof-occupancy",
        "Prepare proof of occupancy",
        "The simulated portal requested proof of occupancy. Review accepted documents before responding.",
        "documents",
        1,
        twin.facts
          .filter((f) => f.type === "application_update")
          .map((f) => f.id),
        true,
      ),
    );
  if (!items.length)
    items.push(
      action(
        "stay-ready",
        "No current action needed",
        "DisasterPath is watching the demo event stream for a meaningful change.",
        "recovery",
        1,
      ),
    );
  return [
    ...new Map(
      items
        .sort((a, b) => a.priority - b.priority)
        .map((item) => [item.id, item]),
    ).values(),
  ].slice(0, 3);
}

export function compileDeterministically(
  twin: RecoveryTwin,
): Omit<
  CrisisCompilerResult,
  | "provider"
  | "providerModel"
  | "inferenceMode"
  | "providerNote"
  | "stateChanges"
> {
  const prioritizedActions = actionCatalog(twin);
  return {
    twin: {
      ...twin,
      recoveryTasks: prioritizedActions,
      nextBestAction: prioritizedActions[0],
    },
    urgency: twin.disaster.severity,
    prioritizedActions,
    nextBestActionId: prioritizedActions[0].id,
    requiresHumanEscalation:
      twin.immediateNeeds.medical || twin.disaster.severity === "critical",
  };
}

export type ApplicationDraft = {
  programId: string;
  programName: string;
  fields: {
    key: string;
    label: string;
    value: string;
    source: "recovery_twin" | "user" | "trusted_api" | "unknown";
    confidence: number;
    editable: boolean;
  }[];
  missingFields: string[];
  warnings: string[];
  readyForReview: boolean;
};
export function prepareApplication(
  twin: RecoveryTwin,
  insuranceCoverage?: string,
): ApplicationDraft {
  const fields: ApplicationDraft["fields"] = [
    {
      key: "disasterType",
      label: "Disaster",
      value:
        twin.disaster.type === "flash_flood"
          ? "Flash flooding"
          : twin.disaster.type,
      source: "trusted_api",
      confidence: 0.98,
      editable: true,
    },
    {
      key: "location",
      label: "Location",
      value: `${twin.location.county}, ${twin.location.state}`,
      source: "recovery_twin",
      confidence: 1,
      editable: true,
    },
    {
      key: "housingStatus",
      label: "Housing status",
      value: twin.housing.status,
      source: "recovery_twin",
      confidence: 1,
      editable: true,
    },
    {
      key: "tenure",
      label: "Housing tenure",
      value: twin.housing.renterOrOwner,
      source: "recovery_twin",
      confidence: 1,
      editable: true,
    },
    {
      key: "insuranceCoverage",
      label: "Insurance coverage",
      value: insuranceCoverage || "",
      source: insuranceCoverage ? "user" : "unknown",
      confidence: insuranceCoverage ? 1 : 0,
      editable: true,
    },
  ];
  const missingFields = fields
    .filter((field) => !field.value)
    .map((field) => field.key);
  return {
    programId: "fema-ia",
    programName: "FEMA Individual Assistance",
    fields,
    missingFields,
    warnings: [
      "This is a simulated preparation draft. FEMA determines eligibility.",
    ],
    readyForReview: missingFields.length === 0,
  };
}
