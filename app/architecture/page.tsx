import {
  ArrowDown,
  ArrowLeft,
  Check,
  Database,
  Radio,
  Route,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  Zap,
} from "lucide-react";

export default function ArchitecturePage() {
  const foundryConnected = Boolean(
    process.env.AZURE_FOUNDRY_ENDPOINT &&
    process.env.AZURE_FOUNDRY_API_KEY &&
    process.env.AZURE_FOUNDRY_DEPLOYMENT,
  );
  return (
    <main className="architecture-page">
      <a className="architecture-back" href="/">
        <ArrowLeft size={16} /> Back to demo
      </a>
      <header>
        <p className="eyebrow">HOW DISASTERPATH WORKS</p>
        <h1>One continuous recovery loop.</h1>
        <p>
          Events change the state. The state changes the next action. People
          approve consequential work.
        </p>
      </header>

      <section
        className="architecture-flow"
        aria-label="DisasterPath architecture"
      >
        <div className="architecture-sources">
          <article>
            <Radio />
            <strong>NWS</strong>
            <span className="status-demo">DEMO EVENT</span>
          </article>
          <article>
            <Database />
            <strong>OpenFEMA</strong>
            <span className="status-demo">DEMO EVENT</span>
          </article>
          <article>
            <UserRoundCheck />
            <strong>Survivor</strong>
            <span className="status-live">CONNECTED</span>
          </article>
        </div>
        <ArrowDown className="flow-arrow" />
        <article className="architecture-node">
          <Zap />
          <div>
            <small>EVENT PROCESSING</small>
            <strong>Validated event → state mutation</strong>
          </div>
          <span className="status-live">CONNECTED</span>
        </article>
        <ArrowDown className="flow-arrow" />
        <article className="architecture-node primary">
          <Database />
          <div>
            <small>RECOVERY DIGITAL TWIN</small>
            <strong>Stateful · versioned · event-driven</strong>
          </div>
          <span className="status-live">CONNECTED</span>
        </article>
        <ArrowDown className="flow-arrow" />
        <article className="architecture-node">
          <Sparkles />
          <div>
            <small>CRISIS COMPILER</small>
            <strong>
              {foundryConnected
                ? "Microsoft Foundry"
                : "Validated deterministic fallback"}
            </strong>
          </div>
          <span className={foundryConnected ? "status-live" : "status-demo"}>
            {foundryConnected ? "CONNECTED" : "CREDENTIALS NEEDED"}
          </span>
        </article>
        <ArrowDown className="flow-arrow" />
        <article className="architecture-node">
          <Route />
          <div>
            <small>NEXT BEST ACTION</small>
            <strong>Allowed actions + geometry evidence</strong>
          </div>
          <span className="status-live">COMPUTED</span>
        </article>
        <ArrowDown className="flow-arrow" />
        <article className="architecture-node">
          <ShieldCheck />
          <div>
            <small>RECOVERY AGENT</small>
            <strong>Prepare → review → human approval → action</strong>
          </div>
          <span className="status-live">CONNECTED</span>
        </article>
        <div className="loop-back">
          <span>Application status event updates the Twin again</span>
          <ArrowDown />
        </div>
      </section>

      <section className="architecture-legend">
        <div>
          <span className="status-live">CONNECTED</span>
          <p>Running implementation in this demo</p>
        </div>
        <div>
          <span className="status-demo">DEMO EVENT</span>
          <p>Deterministic fictional data, visibly labeled</p>
        </div>
        <div>
          <span className="status-adapter">PRODUCTION ADAPTER</span>
          <p>Interface exists; external resource is not connected</p>
        </div>
      </section>

      <section className="adapter-strip">
        <div>
          <Check />
          <span>
            <strong>NWS / OpenFEMA</strong>Live lookup adapters exist; demo
            events drive the Twin
          </span>
        </div>
        <div>
          <span className="status-adapter">PRODUCTION ADAPTER</span>
          <span>
            <strong>Azure Maps</strong>Credential and response normalization
            required
          </span>
        </div>
        <div>
          <span className="status-adapter">PRODUCTION ADAPTER</span>
          <span>
            <strong>Microsoft Fabric</strong>Eventstream subscription not
            connected
          </span>
        </div>
      </section>
    </main>
  );
}
