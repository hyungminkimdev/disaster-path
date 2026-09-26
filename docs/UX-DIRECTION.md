# DisasterPath UX direction

## Product decision

The primary experience is an event-driven recovery dashboard that stays calm until something changes. When action is required, it shows the change, the next three priorities, and one prominent next step. Natural-language intake remains the front door for a survivor who arrives without an existing Recovery Twin.

The core journey is: **event arrives → facts update → priorities recompile → person reviews → approved action executes → status is tracked**.

## Interaction principles

- Begin with reassurance and the current state, not a wall of tasks.
- Reveal detail progressively. Keep the next action visually dominant.
- Reuse confirmed facts and ask one missing question at a time.
- Explain why a route or action changed in plain language.
- Reserve red for immediate danger or required action.
- Keep simulation, source, and provider labels visible.
- Require human review before submission.
- Preserve the essential next step in low power mode.

## Visual direction

The interface uses a warm neutral canvas, dark navy text, deep teal for primary actions, and restrained amber/red risk states. System fonts avoid external dependencies. Cards follow a consistent grid, controls are at least 48px high, and strong focus states support keyboard use. Maps and timelines appear only when they answer an immediate question.

The desktop dashboard collapses to a single readable column on a phone. Low power mode removes maps, long explanations, and secondary controls while retaining risk, the next action, and critical facts.

## References

- [GOV.UK question pages](https://design-system.service.gov.uk/patterns/question-pages/): one question at a time and a clear reason for asking.
- [USWDS step indicators](https://designsystem.digital.gov/components/step-indicator/): concise progress and explicit current state.
- [American Red Cross shelter guidance](https://www.redcross.org/get-help/disaster-relief-and-recovery-services/find-an-open-shelter.html): direct access to current official shelter information.
- [Microsoft Fabric Real-Time Intelligence](https://learn.microsoft.com/en-us/fabric/real-time-intelligence/): the intended event ingestion and monitoring boundary.
- [Azure Maps Route API](https://learn.microsoft.com/en-us/rest/api/maps/route/): the intended production route provider.

## Validation plan

Run five formative tests on a phone using fictional scenarios. Measure time to the first actionable step, wrong turns, repeated questions, route-risk comprehension, and whether participants understand when an application has or has not been submitted. Ask participants to explain the current status and next action without prompting.
