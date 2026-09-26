# DisasterPath

**Event-Driven AI Recovery Autopilot — Help finds you.**

## Why DisasterPath is different

**Traditional**  
Alert → Search → Read → Apply → Track

**DisasterPath**  
Event → Recovery Twin → Microsoft Foundry → Next Best Action → Human Approval → Action → Recovery Twin

DisasterPath maintains a survivor-controlled, versioned Recovery Digital Twin. Disaster and case events update trusted state, the Crisis Compiler reprioritizes a bounded action catalog, and the Recovery Agent prepares work for human review. The loop continues after submission.

## What's actually implemented

### Real implementation

- Central Recovery Digital Twin reducer with versions, events, facts, applications, and computed diffs
- Crisis Compiler with strict structured output validation and policy checks
- Microsoft Foundry Chat Completions integration, activated only when credentials are configured
- Deterministic compiler fallback with visible disclosure
- NWS and OpenFEMA read-only retrieval adapters
- Turf LineString × Polygon intersection for both route candidates
- Dynamic application field mapping and missing-field detection
- Editable review and explicit human approval
- Server-enforced approval and an actual POST to the simulated portal
- Server-generated application ID, application events, Recovery GPS, Passport, and Low Power Mode

### Demo data

- Fictional Fairfax household and disaster scenario
- NWS warning event, OpenFEMA declaration event, warning polygon, shelter, and route coordinates
- Simulated government portal, status updates, and `DEMO-2026-*` receipts

### Production adapters

- Azure Maps provider boundary; credential and response normalization are not connected
- Microsoft Fabric event-source boundary; no Eventstream subscription is connected
- NWS/OpenFEMA polling can return live reference data, but the scripted Recovery Twin events remain simulated
- Browser application executor boundary; no real agency system is targeted

See [Technical Proof](docs/TECHNICAL-PROOF.md) for the feature-by-feature audit.

## Microsoft Foundry

Foundry receives only trusted facts, the current Recovery Twin state, the actual reducer diff, and a deterministic list of allowed actions. It returns strict JSON containing urgency, one to three action IDs, the next action, a short explanation, and a human-escalation flag.

The server rejects invalid schemas, unknown actions, an inconsistent next action, or any attempt to change event-derived urgency. Foundry does not determine official facts, eligibility, deadlines, routes, or application status.

The configured `gpt-4.1-mini` deployment has been verified end-to-end through the production `/api/compile` route. A successful response is labeled **MICROSOFT FOUNDRY · gpt-4.1-mini · Live inference**. Any timeout or validation failure remains visibly labeled **Validated fallback**.

## Technical proof

- `lib/recovery.ts` — Recovery Twin, event reducer, state diffs, action catalog, application mapping
- `lib/crisis-compiler.ts` — Foundry v1 call, strict JSON schema, allow-list enforcement, fallback
- `lib/route-risk.ts` — Turf geometry computation
- `app/api/demo-government/application/route.ts` — server approval gate and receipt generation
- `lib/application-executor.ts` — actual client POST to the simulated endpoint
- `tests/recovery.test.ts` — transition, geometry, missing-field, closed-loop, and approval tests
- `/architecture` — judge-facing runtime architecture and honest connection status

## Run the 3-minute demo

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then:

1. Demo simulation → **Reset demo**
2. **NEXT DEMO EVENT — Simulate flash flood**
3. **NEXT DEMO EVENT — Report home flooded**
4. **NEXT DEMO EVENT — 24 hours later**
5. **Review assistance** → **Prepare my draft**
6. Insurance **Yes** → **Continue to review**
7. Check approval → **Approve & continue**
8. **Simulate document request**
9. **Prepare case-worker handoff**
10. **How it works**

Use the timed narration in [Final Demo Runbook](docs/FINAL-DEMO-RUNBOOK.md). A shorter implementation walkthrough is in [Technical Demo](docs/TECHNICAL-DEMO.md).

## Verify

```bash
npm run typecheck
npm test
npm run build
npm audit
```

The demo contains only fictional personal information. It never submits to FEMA or any real government service.
# disaster-path
