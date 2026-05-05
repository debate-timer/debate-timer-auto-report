# Research: Phase 1-2 Amplitude Adapter 구현

**Date**: 2026-04-27  
**Feature**: [spec.md](./spec.md)

## Decision 1: Use Amplitude Dashboard REST API Event Segmentation

**Decision**: Query `GET https://amplitude.com/api/2/events/segmentation` for `timer_started`.

**Rationale**: Amplitude's Dashboard REST API exposes dashboard graph data as JSON and the Event Segmentation endpoint is designed to get metrics for an event. The official docs show `e`, `start`, and `end` query parameters, plus `m=totals` for event totals and `i=7` for weekly interval aggregation.

**Source**: [Amplitude Dashboard REST API](https://amplitude.com/docs/apis/analytics/dashboard-rest)

**Alternatives considered**:

- Events list endpoint: useful for current visible event totals, but not enough control over explicit target period.
- Export API: too broad for one metric count and not aligned with the dashboard query model.
- Saved chart endpoint: would require pre-created chart IDs and make local development harder.

## Decision 2: Use Basic Auth with Existing Env Vars

**Decision**: Build a Basic Authorization header from `AMPLITUDE_API_KEY` and `AMPLITUDE_SECRET_KEY`.

**Rationale**: Amplitude documents Dashboard REST API authentication as Basic auth using the API key as username and secret key as password. Phase 1-1 already validates both environment variables.

**Security rule**: The generated Authorization header is request-only. It must not be stored in `rawRef`, logs, fixtures, thrown errors, or snapshot rows.

**Alternatives considered**:

- Store precomputed token in env: avoids runtime encoding but creates another secret to manage.
- Pass API key in query params: not aligned with the Dashboard REST API docs and easier to leak.

## Decision 3: Use Built-In `fetch` with an Injectable Token

**Decision**: Use Node.js built-in `fetch` and expose it through an `AMPLITUDE_FETCH` provider token.

**Rationale**: The project has no HTTP client dependency yet and Phase 1-2 needs one GET request. Adding Axios or `@nestjs/axios` would increase dependency surface before there is a broader HTTP abstraction need.

**Operational guardrail**: Wrap the injected fetch call with `AbortController` so a hung Amplitude request becomes a bounded `AmplitudeApiError` instead of blocking the collection flow indefinitely.

**Testability**: Unit tests replace `AMPLITUDE_FETCH` with a `jest.fn()` fetch-compatible function. No test calls real Amplitude.

**Alternatives considered**:

- `@nestjs/axios`: more Nest-native for many HTTP calls, but premature for one endpoint.
- Axios directly: familiar, but still a new dependency with no current need.
- No timeout: simpler, but a hung external request would violate per-metric failure isolation.

## Decision 4: Convert KST Period Boundaries to Amplitude Date Strings

**Decision**: Add a small `common/time/kst-date.ts` helper that formats:

- `periodStart` as KST `YYYYMMDD`
- `periodEnd` as KST `YYYYMMDD` after subtracting one millisecond from the exclusive end boundary

**Rationale**: The Phase 1-1 data model stores period boundaries as UTC `DateTime` while the product defines weekly periods in Asia/Seoul. Amplitude expects `start` and `end` date strings. The official docs also state the Dashboard REST API time zone follows the Amplitude project time zone, so the local assumption is that the Amplitude project is configured to Asia/Seoul.

**Operational note**: Before production use, verify the Amplitude project time zone is Asia/Seoul. If it is not, weekly boundaries will be shifted.

**Alternatives considered**:

- Add a date-time library now: unnecessary for formatting two dates.
- Use server local timezone: violates the repo rule not to depend on server timezone.

## Decision 5: Use `seriesCollapsed` Total, Empty Success as Zero

**Decision**: For successful Event Segmentation responses, read the total from `data.seriesCollapsed[0][0].value`. If the successful response has no series values, return `0`.

**Rationale**: Phase 1-2 needs the whole-period count for a single event and no segment. `seriesCollapsed` is documented as the bar chart total for the Event Segmentation result. A successful empty response means no events in the period, not an API failure.

**Alternatives considered**:

- Sum `data.series[0]`: works for simple intervals but couples the logic to interval granularity.
- Treat empty as failure: would make "0 events" indistinguishable from API/transform failure.

## Decision 6: No-Op Duplicate Snapshot Persistence

**Decision**: If a snapshot already exists for the same metric definition, period type, period key, segment key, and segment value, preserve the existing row and do not overwrite the value.

**Rationale**: Phase 1-2 has no explicit `force` or rerun policy. Preserving the first stored value avoids accidental drift during repeated local runs and aligns with the spec clarification.

**Alternatives considered**:

- Update on duplicate: useful for forced reruns, but that policy belongs with Phase 1-3 execution controls.
- Throw on duplicate: makes repeated local verification noisy.

## Decision 7: Return Failure Results Instead of Throwing for Expected Collection Failures

**Decision**: `MetricSourceAdapter.collect(...)` returns a discriminated union. Unsupported period, unsupported query spec, API failures, and malformed responses become failed results.

**Rationale**: Issue #7 requires failed metrics to be isolated so future multi-metric runs can continue. Throwing for expected external failure cases would force every caller to reconstruct per-metric state from exceptions.

**Alternatives considered**:

- Throw domain exceptions: good for controllers, not ideal for per-metric collection outcomes.
- Return `null`: loses failure reason and is hard to test.
