# NoLLM Flexible Overlay Timing Design

## Goal

Adjust the existing `SEO/GEO Analyse Assistent NoLLM` loading overlay so the visible analysis steps advance at a calmer pace of about `4s` per phase while the webhook request is still pending.

The overlay should feel psychologically steady for typical webhook durations of roughly `15s` to `25s`, but it must remain flexible:

- do not enforce a fixed minimum total duration
- do not wait for all five stages if the webhook finishes earlier
- keep the current frontend-only progress model without backend telemetry

## Chosen Approach

Keep the current staged overlay model and retune it for slower perceived progress:

1. show step 1 immediately when submit starts
2. advance to the next visible step every `4000ms` while the request is still pending
3. stop auto-advancing once the last visible step is active
4. if the webhook is still running after the last step appears, keep step 5 active until the real response arrives
5. once a usable response is confirmed, switch the overlay to a short completed state and then navigate as before

## UX Notes

- this keeps the five-step sequence aligned with the real request duration instead of racing ahead in the first few seconds
- a fast response is allowed to finish early because the user explicitly prefers flexibility over a forced `20s` timeline
- a short completion hold of a few hundred milliseconds is still useful so the success state can register before the route changes

## Scope

- update `src/app/pages/seo-geo-assistant-nollm/seo-geo-assistant-nollm.ts`
- no webhook contract changes
- no template copy changes required

## Verification

- confirm the overlay opens immediately after submit
- confirm visible steps move roughly every `4s` during a slow request
- confirm step 5 can remain active if the webhook runs longer than `16s`
- confirm a successful response still navigates to the result page
- confirm failures still close the overlay and show the existing error message
