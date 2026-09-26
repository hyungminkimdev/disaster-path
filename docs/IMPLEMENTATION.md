# Implementation status

## P0 vertical slice — complete

- Recovery Digital Twin with household, location, housing, transportation, immediate needs, safety, benefits, applications, and recovery phase.
- Versioned event reducer with visible fact changes and provenance.
- Fixed demo event sequence from calm state through document follow-up.
- Crisis Compiler API with Foundry structured output, Zod validation, bounded timeout, allowed-action enforcement, and deterministic fallback.
- Top-three crisis actions with plain-language reasoning.
- Hazard-aware routing with two route candidates and Turf line/polygon intersection.
- Assistance Radar and a visible newly available assistance program.
- “We already know most of this” preparation flow with one missing insurance question.
- Editable review, explicit human approval, and real POST to a simulated government endpoint.
- Recovery GPS, action-required status update, timeline, and Recovery Passport.
- Session persistence, reset control, responsive layout, keyboard focus, and low power view.

## P1 foundation — complete

- `DisasterEventSource` abstraction with a working demo source and integration boundaries for NWS, OpenFEMA, and Microsoft Fabric Real-Time Intelligence.
- `MapsProvider` abstraction with a working deterministic provider and Azure Maps adapter boundary.
- `ApplicationExecutor` abstraction with a working simulated executor and a Foundry browser-automation boundary.
- Existing natural-language intake, NWS/OpenFEMA adapters, and trusted-data modules remain available for the next integration pass.

## External resources still required

- A Foundry model deployment, endpoint, and API key for live compiler inference.
- An Azure Maps subscription key plus production response normalization and geocoded shelter candidates.
- A Microsoft Fabric workspace/eventstream for live background event delivery.
- Approved agency APIs or an authorized browser-automation environment for real submissions and status checks.

The repository does not claim these resources are connected. Each missing capability has an explicit boundary, and the visible provider note reports what actually ran.

## Next evidence milestone

Connect one live NWS warning to the event-source interface, geocode one verified shelter set through Azure Maps, and run five phone-based usability sessions. Measure time to the first safe action, repeated questions, route comprehension, approval comprehension, and successful follow-up after a document request.
