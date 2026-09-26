"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock3,
  FileCheck2,
  FileText,
  HeartHandshake,
  Home as HomeIcon,
  MapPin,
  Navigation,
  PawPrint,
  Radio,
  RotateCcw,
  Route,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import {
  createInitialTwin,
  prepareApplication,
  type ApplicationDraft,
  type CrisisCompilerResult,
  type DisasterEvent,
  type RecoveryTwin,
} from "@/lib/recovery";
import {
  demoRouteData,
  evaluateDemoRoutes,
  toMapPoint,
} from "@/lib/route-risk";
import { DemoApplicationExecutor } from "@/lib/application-executor";

type Screen =
  | "dashboard"
  | "assistance"
  | "question"
  | "review"
  | "submitting"
  | "recovery"
  | "passport";
const storageKey = "disasterpath-autopilot-v1";
const eventLabels: Record<DisasterEvent["type"], string> = {
  FLASH_FLOOD_WARNING: "Simulate flash flood",
  HOME_FLOODED: "Report home flooded",
  FEMA_ASSISTANCE_DECLARED: "24 hours later",
  RECOVERY_CENTER_OPENED: "Open recovery center",
  APPLICATION_SUBMITTED: "Submit application",
  DOCUMENT_REQUESTED: "Request additional document",
};
const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
const eventId = (type: string) => `${type.toLowerCase()}-${Date.now()}`;

export default function Home() {
  const [twin, setTwin] = useState<RecoveryTwin>(() => createInitialTwin());
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [lastResult, setLastResult] = useState<CrisisCompilerResult | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [forceDemo, setForceDemo] = useState(false);
  const [lowPower, setLowPower] = useState(false);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [insurance, setInsurance] = useState("");
  const [draft, setDraft] = useState<ApplicationDraft | null>(null);
  const [approved, setApproved] = useState(false);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [proofOpen, setProofOpen] = useState(false);
  const [executionStep, setExecutionStep] = useState(0);
  const [submissionId, setSubmissionId] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const routes = useMemo(() => evaluateDemoRoutes(), []);
  const hasAlert =
    twin.disaster.severity === "high" || twin.disaster.severity === "critical";
  const assistanceFound = twin.assistance.individualAssistanceAvailable;
  const application = twin.applications[0];
  const isCrisis = hasAlert && application.status === "not_started";

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.twin?.version && parsed?.twin?.location?.county) {
          setTwin(parsed.twin);
          const restoredInsurance = parsed.insurance || "";
          const restoredScreen = parsed.screen || "dashboard";
          setInsurance(restoredInsurance);
          if (
            restoredScreen === "assistance" ||
            restoredScreen === "question" ||
            restoredScreen === "review" ||
            restoredScreen === "submitting"
          ) {
            setDraft(
              prepareApplication(parsed.twin, restoredInsurance || undefined),
            );
          }
          setScreen(
            restoredScreen === "submitting" ? "review" : restoredScreen,
          );
        }
      }
    } catch {
      /* Session persistence is optional. */
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({ twin, screen, insurance }),
      );
    } catch {
      /* Continue without persistence. */
    }
  }, [twin, screen, insurance, hydrated]);
  useEffect(() => {
    heading.current?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [screen]);

  async function dispatch(
    type: DisasterEvent["type"],
    extra: Partial<DisasterEvent> = {},
    baseTwin: RecoveryTwin = twin,
  ) {
    if (busy) return null;
    setBusy(true);
    setError("");
    const event = {
      id: eventId(type),
      type,
      occurredAt: new Date().toISOString(),
      ...extra,
    } as DisasterEvent;
    try {
      const response = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ twin: baseTwin, event, forceDemo }),
      });
      if (!response.ok) throw new Error("Compiler unavailable");
      const result: CrisisCompilerResult = await response.json();
      setTwin(result.twin);
      setLastResult(result);
      setAnnouncement(
        `${eventLabels[type]}. Next best action updated to ${result.twin.nextBestAction?.title}.`,
      );
      if (type === "DOCUMENT_REQUESTED") setScreen("recovery");
      return result;
    } catch {
      setError(
        "The recovery plan could not update. Please try the demo event again.",
      );
      return null;
    } finally {
      setBusy(false);
      setSimulatorOpen(false);
    }
  }
  function reset() {
    setTwin(createInitialTwin());
    setScreen("dashboard");
    setLastResult(null);
    setInsurance("");
    setDraft(null);
    setApproved(false);
    setError("");
    setAnnouncement("Demo reset.");
    setExecutionStep(0);
    setSubmissionId("");
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* Optional. */
    }
  }
  function startAssistance() {
    setScreen("assistance");
    setDraft(prepareApplication(twin, insurance || undefined));
  }
  function prepare() {
    const nextDraft = prepareApplication(twin, insurance || undefined);
    setDraft(nextDraft);
    setScreen(nextDraft.readyForReview ? "review" : "question");
  }
  async function submitDemo() {
    if (!approved || !draft?.readyForReview) return;
    setScreen("submitting");
    setExecutionStep(1);
    setError("");
    try {
      await new Promise((resolve) => setTimeout(resolve, 280));
      setExecutionStep(2);
      const receipt = await new DemoApplicationExecutor().execute(draft, {
        approved: true,
        approvedAt: new Date().toISOString(),
      });
      setSubmissionId(receipt.applicationId);
      setExecutionStep(3);
      await dispatch("APPLICATION_SUBMITTED", {
        applicationId: receipt.applicationId,
      } as Partial<DisasterEvent>);
      setExecutionStep(4);
      await new Promise((resolve) => setTimeout(resolve, 1800));
      setScreen("recovery");
      setAnnouncement(
        `Simulated submission received as ${receipt.applicationId}.`,
      );
    } catch {
      setError(
        "The simulated portal did not accept the draft. No submission occurred.",
      );
      setScreen("review");
    }
  }
  function editField(key: string, value: string) {
    if (!draft) return;
    const fields = draft.fields.map((field) =>
      field.key === key
        ? { ...field, value, source: "user" as const, confidence: 1 }
        : field,
    );
    const missingFields = fields
      .filter((field) => !field.value.trim())
      .map((field) => field.key);
    setDraft({
      ...draft,
      fields,
      missingFields,
      readyForReview: missingFields.length === 0,
    });
    setApproved(false);
  }
  const suggestedEvent: DisasterEvent["type"] | null = !hasAlert
    ? "FLASH_FLOOD_WARNING"
    : twin.housing.status === "safe"
      ? "HOME_FLOODED"
      : !assistanceFound
        ? "FEMA_ASSISTANCE_DECLARED"
        : application.status === "under_review"
          ? "DOCUMENT_REQUESTED"
          : null;

  return (
    <div
      className={`autopilot ${isCrisis ? "crisis" : ""} ${lowPower ? "low-power" : ""}`}
    >
      <a className="skip-link" href="#main">
        Skip to recovery plan
      </a>
      <header className="autopilot-header">
        <button className="brand-button" onClick={() => setScreen("dashboard")}>
          <span className="route-mark">
            <Route size={22} />
          </span>
          <span>
            <strong>DisasterPath</strong>
            <small>Help finds you.</small>
          </span>
        </button>
        <div className="header-status">
          <span className={`mode-badge ${isCrisis ? "warning" : ""}`}>
            DEMO SIMULATION
          </span>
          <span className="place">
            <MapPin size={14} />
            {twin.location.county}, {twin.location.state}
          </span>
          <button
            className="plain-button"
            onClick={() => setLowPower((value) => !value)}
          >
            {lowPower ? "Full view" : "Low power"}
          </button>
          <a className="plain-button" href="/architecture">
            How it works
          </a>
        </div>
      </header>

      <main id="main" className="autopilot-main">
        {screen === "dashboard" && (
          <>
            <section className="status-hero">
              <div>
                <p className="overline">RECOVERY AUTOPILOT</p>
                <h1 ref={heading} tabIndex={-1}>
                  {isCrisis
                    ? "Here’s what matters now."
                    : assistanceFound && application.status === "not_started"
                      ? "New help found for you."
                      : application.status !== "not_started"
                        ? "Your recovery plan updated."
                        : "No current action needed."}
                </h1>
                <p>
                  {isCrisis
                    ? "The situation changed. Your plan changed with it."
                    : assistanceFound && application.status === "not_started"
                      ? "A fictional assistance update matches your county and reported needs."
                      : application.status !== "not_started"
                        ? "DisasterPath recalculated the next best action from the latest case update."
                        : "DisasterPath is watching the demo event stream for a meaningful change."}
                </p>
              </div>
              <div className="risk-meter">
                <span>RECOVERY RISK</span>
                <strong>{twin.disaster.severity.toUpperCase()}</strong>
                <i className={twin.disaster.severity} />
              </div>
            </section>
            {lastResult && <StateTransitionStrip result={lastResult} />}

            {assistanceFound && application.status === "not_started" ? (
              <>
                <section className="assistance-radar">
                  <div className="radar-icon">
                    <HeartHandshake size={28} />
                  </div>
                  <div className="radar-copy">
                    <span className="eyebrow">ASSISTANCE RADAR · NEW</span>
                    <h2>FEMA Individual Assistance</h2>
                    <p>
                      This assistance may be relevant based on current
                      information. FEMA determines eligibility.
                    </p>
                    <ul>
                      <li>Your county matches the fictional declaration</li>
                      <li>Individual Assistance is enabled in this scenario</li>
                      <li>Your reported housing damage may be relevant</li>
                    </ul>
                    <button
                      className="primary-button"
                      onClick={startAssistance}
                    >
                      Review assistance
                      <ArrowRight size={17} />
                    </button>
                    {lastResult && (
                      <details className="why-panel radar-proof">
                        <summary>Why this match?</summary>
                        <TechnicalProof twin={twin} result={lastResult} />
                      </details>
                    )}
                  </div>
                </section>
                {lastResult && <WhatChanged result={lastResult} />}
              </>
            ) : (
              <section className="next-action-panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">
                      {isCrisis
                        ? "YOUR NEXT 3 ACTIONS"
                        : "YOUR NEXT BEST ACTION"}
                    </span>
                    <h2>{twin.nextBestAction?.title || "Stay ready"}</h2>
                  </div>
                  {busy && (
                    <span className="thinking">
                      <Sparkles size={15} />
                      Updating…
                    </span>
                  )}
                </div>
                <div className="action-stack">
                  {(twin.recoveryTasks.length
                    ? twin.recoveryTasks
                    : [
                        {
                          id: "ready",
                          title: "You’re ready",
                          description:
                            "No new action is needed in this fictional scenario.",
                          category: "recovery",
                          priority: 1,
                          sourceIds: [],
                          requiresApproval: false,
                          completed: false,
                        },
                      ]
                  )
                    .slice(0, lowPower ? 1 : 3)
                    .map((action, index) => (
                      <article
                        key={action.id}
                        className={index === 0 ? "featured-action" : ""}
                      >
                        <span className="action-order">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <h3>{action.title}</h3>
                          <p>{action.description}</p>
                          {action.id === "review-assistance" && (
                            <button
                              className="inline-action"
                              onClick={startAssistance}
                            >
                              Review assistance
                              <ArrowRight size={15} />
                            </button>
                          )}
                        </div>
                      </article>
                    ))}
                </div>
                {hasAlert && (
                  <details className="why-panel">
                    <summary>
                      Why these actions?
                      <ChevronDown size={16} />
                    </summary>
                    <TechnicalProof twin={twin} result={lastResult} />
                    <p>{lastResult?.providerNote}</p>
                  </details>
                )}
                {lastResult && <WhatChanged result={lastResult} />}
              </section>
            )}

            {hasAlert && !lowPower && <HazardMap routes={routes} />}
            {!lowPower && (
              <div className="dashboard-lower">
                <EventTimeline twin={twin} />
                <TwinPanel twin={twin} result={lastResult} />
              </div>
            )}
            {lowPower && (
              <section className="low-power-links">
                <a href="tel:911">Call 911 for immediate danger</a>
                {hasAlert && (
                  <a
                    href="https://www.weather.gov/safety/flood-during"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Official flood guidance
                  </a>
                )}
                <button onClick={() => setScreen("passport")}>
                  Save recovery pass
                </button>
              </section>
            )}
          </>
        )}

        {screen === "assistance" && (
          <FlowShell
            eyebrow="ASSISTANCE FOUND"
            title="We already know most of this."
            description="Your Recovery Twin carries the details you already shared. The preparation agent maps them into a draft and identifies only what is missing."
            onBack={() => setScreen("dashboard")}
          >
            <div className="known-grid">
              {prepareApplication(twin, insurance || undefined).fields.map(
                (field) => (
                  <div
                    key={field.key}
                    className={field.value ? "known" : "missing"}
                  >
                    <span>{field.value ? <Check size={15} /> : "?"}</span>
                    <div>
                      <small>{field.label}</small>
                      <strong>{field.value || "Still needed"}</strong>
                    </div>
                    <em>{field.source.replace("_", " ")}</em>
                  </div>
                ),
              )}
            </div>
            <p className="mapping-count">
              <strong>
                {
                  prepareApplication(
                    twin,
                    insurance || undefined,
                  ).fields.filter((field) => field.value).length
                }{" "}
                fields reused
              </strong>
              <span>·</span>
              <strong>
                {prepareApplication(twin, insurance || undefined).missingFields
                  .length || 0}{" "}
                question needed
              </strong>
            </p>
            <div className="agent-proof">
              <Sparkles size={19} />
              <p>
                <strong>
                  Preparation logic ran against Recovery Twin v{twin.version}.
                </strong>
                <br />
                Known fields were mapped;{" "}
                {prepareApplication(twin).missingFields.length} missing field
                was identified.
              </p>
            </div>
            <button className="primary-button" onClick={prepare}>
              Prepare my draft
              <ArrowRight size={17} />
            </button>
          </FlowShell>
        )}

        {screen === "question" && (
          <FlowShell
            eyebrow="ONE MISSING DETAIL"
            title="Is the damaged property covered by insurance?"
            description="It’s okay if you’re not sure. This answer is added to the draft as information you provided."
            onBack={() => setScreen("assistance")}
          >
            <div className="choice-grid">
              {["Yes", "No", "Not sure"].map((value) => (
                <button
                  key={value}
                  className={insurance === value ? "selected" : ""}
                  onClick={() => setInsurance(value)}
                >
                  {value}
                  {insurance === value && <Check size={17} />}
                </button>
              ))}
            </div>
            <button
              className="primary-button"
              disabled={!insurance}
              onClick={prepare}
            >
              Continue to review
              <ArrowRight size={17} />
            </button>
          </FlowShell>
        )}

        {screen === "review" && draft && (
          <FlowShell
            eyebrow="HUMAN APPROVAL REQUIRED"
            title="Ready for review."
            description="This is exactly what the agent will send to the simulated government portal. Every field remains editable."
            onBack={() => setScreen("assistance")}
          >
            <div className="draft-sheet">
              <div className="draft-title">
                <FileText size={20} />
                <strong>{draft.programName}</strong>
                <span>DEMO DRAFT</span>
              </div>
              {draft.fields.map((field) => (
                <label key={field.key}>
                  <span>
                    {field.label}
                    <small>
                      {field.source.replace("_", " ")} ·{" "}
                      {Math.round(field.confidence * 100)}% confidence
                    </small>
                  </span>
                  <input
                    value={field.value}
                    onChange={(event) =>
                      editField(field.key, event.target.value)
                    }
                    aria-label={field.label}
                  />
                </label>
              ))}
              <p className="warning-copy">{draft.warnings[0]}</p>
            </div>
            <label className="approval">
              <input
                type="checkbox"
                checked={approved}
                onChange={(event) => setApproved(event.target.checked)}
              />
              <span>
                I reviewed these details and approve sending them to the{" "}
                <strong>simulated demo portal</strong>.
              </span>
            </label>
            <p className="approval-gate">
              The agent cannot submit until you approve.
            </p>
            <button
              className="primary-button"
              disabled={!approved || !draft.readyForReview}
              onClick={submitDemo}
            >
              Approve &amp; continue
              <ArrowRight size={17} />
            </button>
            <p className="fine-print">
              No data is sent to FEMA or any real government system.
            </p>
          </FlowShell>
        )}

        {screen === "submitting" && (
          <FlowShell
            eyebrow="SIMULATED EXECUTION"
            title="Sending your approved draft…"
            description="The demo executor is making a real request to the local simulated government endpoint."
            onBack={() => {}}
          >
            <div className="submission-steps">
              {[
                "Preparing request",
                "Human approval verified",
                "Submitting to simulated government portal",
                "Application received",
              ].map((label, index) => (
                <span
                  key={label}
                  className={
                    executionStep > index
                      ? "complete"
                      : executionStep === index
                        ? "active"
                        : ""
                  }
                >
                  {executionStep > index ? <Check /> : <Clock3 />}
                  {label}
                </span>
              ))}
              {submissionId && (
                <strong className="submission-id">{submissionId}</strong>
              )}
              <small>SIMULATED GOVERNMENT PORTAL — DEMO ONLY</small>
            </div>
          </FlowShell>
        )}

        {screen === "recovery" && (
          <FlowShell
            eyebrow={
              application.status === "action_required"
                ? "ACTION REQUIRED"
                : "RECOVERY GPS"
            }
            title={
              application.status === "action_required"
                ? "They need one more document."
                : "Your plan moved forward."
            }
            description={
              application.status === "action_required"
                ? "The simulated portal requested proof of occupancy. No deadline was included in the notice."
                : "Your approved draft reached the simulated portal and your Recovery Twin updated automatically."
            }
            onBack={() => setScreen("dashboard")}
          >
            <div
              className={`next-best ${application.status === "action_required" ? "attention" : ""}`}
            >
              <span>YOUR NEXT BEST ACTION</span>
              <h2>{twin.nextBestAction?.title}</h2>
              <p>{twin.nextBestAction?.description}</p>
              {application.status === "action_required" ? (
                <button
                  className="primary-button"
                  onClick={() => setScreen("passport")}
                >
                  Prepare case-worker handoff
                  <ArrowRight size={17} />
                </button>
              ) : (
                <button
                  className="secondary-button"
                  onClick={() => void dispatch("DOCUMENT_REQUESTED")}
                >
                  Simulate document request
                  <Zap size={16} />
                </button>
              )}
            </div>
            <div className="case-progress">
              <h2>My recovery</h2>
              <div>
                <Check />
                <span>Safety plan reviewed</span>
              </div>
              <div>
                <Check />
                <span>
                  Demo application submitted{" "}
                  <small>{application.externalId}</small>
                </span>
              </div>
              <div
                className={
                  application.status === "action_required"
                    ? "current"
                    : "pending"
                }
              >
                {application.status === "action_required" ? (
                  <AlertTriangle />
                ) : (
                  <Clock3 />
                )}
                <span>
                  Proof of occupancy{" "}
                  {application.status === "action_required"
                    ? "requested"
                    : "not requested"}
                </span>
              </div>
            </div>
            {lastResult && <WhatChanged result={lastResult} />}
            <div className="recovery-actions">
              <button
                className="secondary-button"
                onClick={() => setScreen("passport")}
              >
                View Recovery Passport
                <ArrowRight size={16} />
              </button>
              <a href="/demo/government-portal" target="_blank">
                View simulated portal
                <ArrowUpRight size={15} />
              </a>
            </div>
          </FlowShell>
        )}

        {screen === "passport" && (
          <FlowShell
            eyebrow="RECOVERY PASSPORT"
            title="Tell your story once."
            description="A concise, demo-safe summary for a case worker. Review before sharing; no sensitive identifiers are included."
            onBack={() =>
              setScreen(
                application.status === "not_started" ? "dashboard" : "recovery",
              )
            }
          >
            <div className="passport">
              <div className="passport-head">
                <span className="route-mark">
                  <Route size={22} />
                </span>
                <div>
                  <strong>DISASTERPATH RECOVERY PASS</strong>
                  <small>Demo-safe household summary</small>
                </div>
              </div>
              <div className="passport-event">
                <span>
                  {twin.disaster.type === "flash_flood"
                    ? "Flood"
                    : twin.disaster.type}
                </span>
                <strong>
                  {twin.location.county}, {twin.location.state}
                </strong>
              </div>
              <div className="passport-grid">
                <div>
                  <small>HOUSEHOLD</small>
                  <p>
                    {twin.household.adults} adult
                    <br />
                    {twin.household.children} child
                    <br />
                    {twin.household.pets.join(", ") || "No pets reported"}
                  </p>
                </div>
                <div>
                  <small>CURRENT NEEDS</small>
                  <p>
                    {twin.immediateNeeds.shelter
                      ? "Temporary housing"
                      : "No shelter need reported"}
                    <br />
                    {twin.immediateNeeds.petSupport ? "Pet support" : "—"}
                  </p>
                </div>
                <div>
                  <small>DAMAGE</small>
                  <p>
                    Home: {twin.housing.status}
                    <br />
                    ID: {twin.documents.id}
                  </p>
                </div>
                <div>
                  <small>RECOVERY STATUS</small>
                  <p>
                    Assistance: {application.status.replaceAll("_", " ")}
                    <br />
                    {application.externalId || "No application ID"}
                  </p>
                </div>
              </div>
              <div className="passport-next">
                <small>NEXT ACTION</small>
                <strong>{twin.nextBestAction?.title}</strong>
              </div>
            </div>
            <div className="passport-actions">
              <button className="primary-button" onClick={() => window.print()}>
                Print / save as PDF
                <FileCheck2 size={17} />
              </button>
              <button
                className="secondary-button"
                onClick={() =>
                  navigator.clipboard
                    ?.writeText(
                      `${twin.disaster.type} · ${twin.location.county}, ${twin.location.state}\nHousing: ${twin.housing.status}\nApplication: ${application.status}\nNext: ${twin.nextBestAction?.title}`,
                    )
                    .then(() => setAnnouncement("Recovery Passport copied."))
                }
              >
                Copy for case worker
              </button>
            </div>
            <p className="fine-print">
              Demo behavior: this is copied locally. Nothing is shared
              automatically.
            </p>
          </FlowShell>
        )}

        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}
        <div className="sr-only" aria-live="polite">
          {announcement}
        </div>
      </main>

      {screen === "dashboard" && (
        <div className="simulator-wrap">
          <button
            className="simulator-trigger"
            onClick={() => setSimulatorOpen((value) => !value)}
          >
            <Zap size={17} />
            Demo simulation
            <ChevronDown size={15} />
          </button>
          {simulatorOpen && (
            <div className="simulator-menu">
              <div>
                <strong>Event stream</strong>
                <small>Fictional events · never shown as live</small>
              </div>
              {(
                [
                  "FLASH_FLOOD_WARNING",
                  "HOME_FLOODED",
                  "FEMA_ASSISTANCE_DECLARED",
                  "RECOVERY_CENTER_OPENED",
                  "DOCUMENT_REQUESTED",
                ] as DisasterEvent["type"][]
              ).map((type) => (
                <button
                  key={type}
                  disabled={
                    busy ||
                    (type === "DOCUMENT_REQUESTED" &&
                      application.status !== "under_review")
                  }
                  onClick={() => void dispatch(type)}
                >
                  <span>{eventLabels[type]}</span>
                  <small>{type.replaceAll("_", " ")}</small>
                </button>
              ))}
              <label>
                <input
                  type="checkbox"
                  checked={forceDemo}
                  onChange={(event) => setForceDemo(event.target.checked)}
                />
                Deterministic compiler
              </label>
              <button className="reset-button" onClick={reset}>
                <RotateCcw size={14} />
                Reset demo
              </button>
              <button
                className="reset-button"
                onClick={() => setProofOpen(true)}
              >
                Technical proof
              </button>
            </div>
          )}
        </div>
      )}
      {screen === "dashboard" && suggestedEvent && (
        <button
          className="judge-next"
          disabled={busy}
          onClick={() => void dispatch(suggestedEvent)}
        >
          <span>
            <small>NEXT DEMO EVENT</small>
            {eventLabels[suggestedEvent]}
          </span>
          <ArrowRight size={19} />
        </button>
      )}
      {proofOpen && (
        <TechnicalProofModal
          result={lastResult}
          onClose={() => setProofOpen(false)}
        />
      )}
    </div>
  );
}

function FlowShell({
  eyebrow,
  title,
  description,
  onBack,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="flow-shell">
      <button className="back-button" onClick={onBack}>
        ← Back
      </button>
      <p className="eyebrow">{eyebrow}</p>
      <h1 tabIndex={-1}>{title}</h1>
      <p className="flow-description">{description}</p>
      {children}
    </section>
  );
}
function fieldLabel(field: string) {
  const labels: Record<string, string> = {
    "disaster.severity": "Recovery risk",
    "housing.status": "Housing",
    "immediateNeeds.shelter": "Shelter need",
    "assistance.individualAssistanceAvailable": "Assistance",
    "applications.fema-ia.status": "Application",
    nextBestAction: "Next best action",
  };
  return labels[field] || field;
}

function displayValue(value: string) {
  if (value === "true") return "Available";
  if (value === "false") return "Unavailable";
  return value.replaceAll("_", " ");
}

function TechnicalProof({
  twin,
  result,
}: {
  twin: RecoveryTwin;
  result: CrisisCompilerResult | null;
}) {
  const latestEvent = twin.events.at(-1);
  return (
    <div className="technical-proof" aria-label="Technical proof">
      <span>
        <small>TRUSTED INPUT</small>
        <strong>{latestEvent?.sourceLabel || "Recovery state"}</strong>
        <em>
          {latestEvent?.simulated ? "Simulated event" : "Connected source"}
        </em>
      </span>
      <i>→</i>
      <span>
        <small>RECOVERY STATE</small>
        <strong>Twin v{twin.version}</strong>
        <em>{result?.stateChanges.length || 0} computed changes</em>
      </span>
      <i>→</i>
      <span>
        <small>REASONING</small>
        <strong>
          {result?.provider === "foundry"
            ? "MICROSOFT FOUNDRY"
            : "Validated fallback"}
        </strong>
        <em>
          {result?.provider === "foundry"
            ? `${result.providerModel} · Live inference`
            : `${result?.prioritizedActions.length || 0} actions prioritized`}
        </em>
      </span>
    </div>
  );
}

function StateTransitionStrip({ result }: { result: CrisisCompilerResult }) {
  const change =
    result.stateChanges.find((item) => item.field !== "nextBestAction") ||
    result.stateChanges[0];
  if (!change) return null;
  return (
    <div className="state-transition" key={result.twin.version}>
      <span>
        RECOVERY TWIN v{result.twin.version - 1} → v{result.twin.version}
      </span>
      <strong>{fieldLabel(change.field)}</strong>
      <b>{displayValue(change.previousValue)}</b>
      <i>→</i>
      <b>{displayValue(change.nextValue)}</b>
      <small>Updated just now</small>
    </div>
  );
}

function WhatChanged({ result }: { result: CrisisCompilerResult }) {
  const currentVersion = result.twin.version;
  return (
    <details className="change-proof">
      <summary>
        What changed?
        <span>
          Twin v{currentVersion - 1} → v{currentVersion}
        </span>
      </summary>
      <div>
        {result.stateChanges.map((change) => (
          <p key={`${change.field}-${change.nextValue}`}>
            <small>{fieldLabel(change.field)}</small>
            <span>{displayValue(change.previousValue)}</span>
            <i>→</i>
            <strong>{displayValue(change.nextValue)}</strong>
          </p>
        ))}
      </div>
    </details>
  );
}

function EventTimeline({ twin }: { twin: RecoveryTwin }) {
  return (
    <section className="timeline-card">
      <div className="section-title">
        <span>RECOVERY TIMELINE</span>
        <Radio size={16} />
      </div>
      <div className="timeline-list">
        {[...twin.events]
          .reverse()
          .slice(0, 5)
          .map((event, index) => (
            <article key={event.id}>
              <time>{index === 0 ? "NOW" : formatTime(event.occurredAt)}</time>
              <i className={event.kind} />
              <div>
                <strong>{event.title}</strong>
                <dl>
                  <div>
                    <dt>Source</dt>
                    <dd>{event.sourceLabel || "Demo profile"}</dd>
                  </div>
                  {event.stateChanges?.[0] && (
                    <div>
                      <dt>State change</dt>
                      <dd>
                        {fieldLabel(event.stateChanges[0].field)}:{" "}
                        {displayValue(event.stateChanges[0].previousValue)} →{" "}
                        {displayValue(event.stateChanges[0].nextValue)}
                      </dd>
                    </div>
                  )}
                  {event.decision && (
                    <div>
                      <dt>Decision</dt>
                      <dd>{event.decision}</dd>
                    </div>
                  )}
                </dl>
                {event.simulated && <small>SIMULATED</small>}
              </div>
            </article>
          ))}
      </div>
    </section>
  );
}
function TwinPanel({
  twin,
  result,
}: {
  twin: RecoveryTwin;
  result: CrisisCompilerResult | null;
}) {
  const app = twin.applications[0];
  const changed = new Set(result?.stateChanges.map((item) => item.field) || []);
  return (
    <section className="twin-card" key={twin.version}>
      <div className="section-title">
        <span>RECOVERY DIGITAL TWIN</span>
        <span>v{twin.version}</span>
      </div>
      <p className="twin-intro">
        A living model of this household’s recovery state.
      </p>
      <div className="twin-grid">
        <span className={changed.has("housing.status") ? "state-changed" : ""}>
          <Users />
          <small>Household</small>
          <b>1 adult · 1 child</b>
        </span>
        <span
          className={
            changed.has("assistance.individualAssistanceAvailable")
              ? "state-changed"
              : ""
          }
        >
          <PawPrint />
          <small>Pet</small>
          <b>1 dog</b>
        </span>
        <span>
          <HomeIcon />
          <small>Housing</small>
          <b>{twin.housing.status}</b>
        </span>
        <span>
          <HeartHandshake />
          <small>Assistance</small>
          <b>
            {twin.assistance.individualAssistanceAvailable
              ? "Found"
              : "Watching"}
          </b>
        </span>
      </div>
      <div
        className={`twin-status ${changed.has("applications.fema-ia.status") ? "state-changed" : ""}`}
      >
        <span>Application</span>
        <strong>{app.status.replaceAll("_", " ")}</strong>
      </div>
      <small className="updated">
        {result
          ? "Updated just now"
          : `Updated ${formatTime(twin.lastUpdated)}`}
      </small>
    </section>
  );
}
function HazardMap({
  routes,
}: {
  routes: ReturnType<typeof evaluateDemoRoutes>;
}) {
  const points = demoRouteData.hazard[0]
    .map(toMapPoint)
    .map((p) => `${p.x},${p.y}`)
    .join(" ");
  const home = toMapPoint(demoRouteData.home),
    shelter = toMapPoint(demoRouteData.shelter);
  const fastest = routes.find((route) => route.id === "fastest");
  const alternative = routes.find((route) => route.id === "alternative");
  return (
    <section className="route-card">
      <div className="route-copy">
        <span className="eyebrow">HAZARD-AWARE ROUTING</span>
        <h2>The fastest route isn’t always the right route.</h2>
        <p>
          <strong>
            {fastest?.intersectsHazard
              ? "Fastest route intersects the displayed warning polygon."
              : "No intersection detected for the fastest candidate."}
          </strong>{" "}
          {alternative?.intersectsHazard
            ? "The alternative also intersects the displayed warning polygon."
            : "The alternative avoids the displayed warning polygon."}
        </p>
        <div className="route-options">
          {routes.map((route) => (
            <div
              key={route.id}
              className={route.intersectsHazard ? "route-risk" : "route-alt"}
            >
              <i style={{ background: route.color }} />
              <span>
                <strong>{route.label}</strong>
                <small>
                  {route.minutes} min · {route.miles} mi
                </small>
              </span>
              <b>
                {route.intersectsHazard
                  ? "INTERSECTION DETECTED"
                  : "NO POLYGON INTERSECTION"}
              </b>
            </div>
          ))}
        </div>
        <p className="route-disclaimer">
          Risk-aware alternative only. Route avoids the currently identified
          warning polygon. Conditions may change.
        </p>
        <details className="geometry-proof">
          <summary>How was this calculated?</summary>
          <ol>
            <li>Candidate routes represented as LineStrings</li>
            <li>Active warning represented as a Polygon</li>
            <li>Geospatial intersection check performed with Turf</li>
            <li>
              Fastest candidate:{" "}
              {fastest?.intersectsHazard
                ? "intersection detected"
                : "no intersection"}
            </li>
            <li>
              Alternative:{" "}
              {alternative?.intersectsHazard
                ? "intersection detected"
                : "no intersection with displayed polygon"}
            </li>
          </ol>
        </details>
      </div>
      <div className="map-visual">
        <svg
          viewBox="0 0 100 100"
          role="img"
          aria-label="Demo map showing a hazard polygon, a fastest route crossing it, and an alternative route around it"
        >
          <defs>
            <pattern
              id="grid"
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M10 0H0V10"
                fill="none"
                stroke="#d8ded6"
                strokeWidth=".35"
              />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />
          <polygon
            points={points}
            fill="#d76f5c35"
            stroke="#b54a3d"
            strokeWidth=".8"
            strokeDasharray="2 1"
          />
          {routes.map((route) => (
            <polyline
              key={route.id}
              points={route.coordinates
                .map(toMapPoint)
                .map((p) => `${p.x},${p.y}`)
                .join(" ")}
              fill="none"
              stroke={route.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          <circle
            cx={home.x}
            cy={home.y}
            r="3.5"
            fill="#fff"
            stroke="#20342d"
          />
          <circle
            cx={shelter.x}
            cy={shelter.y}
            r="3.5"
            fill="#fff"
            stroke="#245d4d"
          />
          <text x={home.x + 4} y={home.y + 1} fontSize="4">
            HOME
          </text>
          <text x={shelter.x - 19} y={shelter.y - 5} fontSize="4">
            SHELTER
          </text>
          <text x="42" y="54" fontSize="4" fill="#98382e">
            WARNING AREA
          </text>
        </svg>
        <span className="map-badge">
          <Navigation size={13} />
          REAL GEOMETRY CHECK
        </span>
      </div>
    </section>
  );
}

function TechnicalProofModal({
  result,
  onClose,
}: {
  result: CrisisCompilerResult | null;
  onClose: () => void;
}) {
  return (
    <div className="proof-backdrop" role="presentation" onClick={onClose}>
      <section
        className="proof-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="proof-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="proof-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <p className="eyebrow">TECHNICAL PROOF</p>
        <h2 id="proof-title">The product performs the workflow.</h2>
        <div className="proof-list">
          <article>
            <strong>Recovery Digital Twin</strong>
            <span>✓ Stateful · ✓ Versioned · ✓ Event-driven</span>
          </article>
          <article>
            <strong>Crisis Compiler</strong>
            <span>✓ Strict structured input and output</span>
            <em>
              {result?.provider === "foundry"
                ? `Microsoft Foundry · ${result.providerModel} · Live inference`
                : "Validated fallback active"}
            </em>
          </article>
          <article>
            <strong>Hazard routing</strong>
            <span>✓ Turf geometry intersection</span>
            <em>Route LineString × Warning Polygon</em>
          </article>
          <article>
            <strong>Application agent</strong>
            <span>✓ Dynamic mapping · ✓ Missing-field detection</span>
            <em>Human approval enforced server-side</em>
          </article>
          <article>
            <strong>Simulated portal</strong>
            <span>✓ Actual POST · ✓ Server-generated ID</span>
            <em>Demo only — no government submission</em>
          </article>
        </div>
        <a className="primary-button" href="/architecture">
          View architecture <ArrowRight size={16} />
        </a>
      </section>
    </div>
  );
}
