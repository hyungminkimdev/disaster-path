export default function GovernmentPortal() {
  return (
    <main
      style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: "56px 24px",
        fontFamily: "Arial,sans-serif",
        color: "#1d2d27",
      }}
    >
      <div
        style={{
          background: "#fff3cd",
          border: "1px solid #e3c56e",
          padding: 16,
          fontWeight: 700,
        }}
      >
        SIMULATED GOVERNMENT PORTAL — DEMO ONLY
      </div>
      <h1 style={{ fontSize: 40, marginTop: 36 }}>
        Disaster assistance intake
      </h1>
      <p style={{ fontSize: 18, lineHeight: 1.6 }}>
        This local page receives approved DisasterPath demo applications through
        a simulated endpoint. It is not FEMA, DisasterAssistance.gov, or a
        government system.
      </p>
      <h2 style={{ marginTop: 40 }}>What this proves</h2>
      <ul style={{ lineHeight: 1.9 }}>
        <li>The application draft is structured data.</li>
        <li>The user must approve it before the endpoint accepts it.</li>
        <li>
          A successful request returns a demo application ID and timestamp.
        </li>
        <li>No real government action occurs.</li>
      </ul>
      <a
        href="/"
        style={{ display: "inline-block", marginTop: 26, color: "#245d4d" }}
      >
        Return to DisasterPath
      </a>
    </main>
  );
}
