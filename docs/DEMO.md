# Three-minute judge demo

Use fictional data only. Keep the persistent **DEMO SIMULATION** label visible.

| Time | Demo action                                                             | Judge takeaway                                                                                       |
| ---- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 0:00 | Show the calm dashboard and Recovery Twin.                              | “The system begins calm. It does not manufacture urgency.”                                           |
| 0:15 | Select **NEXT DEMO EVENT: Flash flood warning issued**.                 | “An event updates the twin and recompiles the plan.”                                                 |
| 0:35 | Open the route card and compare both paths.                             | “The fastest route crosses the warning polygon. Geometry, not an AI guess, selects the safer route.” |
| 0:55 | Trigger **Home reported flooded**, then the 24-hour event.              | “New facts persist. The survivor does not retell the story.”                                         |
| 1:20 | Trigger **FEMA assistance declared** and select **Prepare assistance**. | “A source change creates an actionable opportunity.”                                                 |
| 1:40 | Answer the one missing insurance question. Review the prefilled fields. | “We ask only for information the twin does not know.”                                                |
| 1:55 | Check approval and submit.                                              | “The person remains in control. This POST goes to a clearly simulated government endpoint.”          |
| 2:12 | Trigger **Agency requested a document**.                                | “Recovery GPS detects the status change and gives one next action.”                                  |
| 2:35 | Open **Recovery Passport** and show print/copy.                         | “Confirmed facts and progress can move with the survivor.”                                           |
| 2:55 | Close on the event-to-outcome loop.                                     | “DisasterPath listens, reasons within trusted bounds, acts after approval, and tracks recovery.”     |

## Proof points to call out

- Microsoft Foundry receives trusted facts, state changes, and an allowed action catalog, then returns schema-constrained priorities.
- If Foundry is not configured or times out, the provider note openly identifies the deterministic fallback.
- Turf performs real line/polygon intersection checks for both route candidates.
- The simulated application endpoint rejects incomplete drafts or requests without explicit approval.
- The Recovery Twin records event provenance and whether each fact is simulated.
- Low power mode retains the current risk, next action, and essential facts.

## Before presenting

1. If available, configure Foundry and verify the UI reports `Microsoft Foundry` in the reasoning panel.
2. Run `npm test`, `npm run typecheck`, and `npm run build`.
3. Select **Reset demo** so the opening state is calm.
4. Never claim that the fixed shelter, assistance eligibility, portal, or confirmation number is real.

If a cloud service fails during judging, continue the same flow and point to the visible fallback disclosure. The product loop remains deterministic and reviewable.
