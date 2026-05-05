# Test Contract: Amplitude Metric Source Adapter

**Files**:

- `src/modules/metric-sources/amplitude/amplitude-query-spec.spec.ts`
- `src/modules/metric-sources/amplitude/amplitude-metric-source.adapter.spec.ts`

**Test targets**:

- `src/modules/metric-sources/amplitude/amplitude-query-spec.ts`
- `src/modules/metric-sources/amplitude/amplitude-metric-source.adapter.ts`

## describe: `Amplitude querySpec 검증`

### test: `timer_started EVENT_COUNT querySpec을 허용한다`

- Input: Phase 1-1 seed querySpec
- Expected: parser returns `{ eventType: 'timer_started' }`

### test: `AMPLITUDE가 아닌 source는 거부한다`

- Input: same shape with `source: 'SENTRY'`
- Expected: `UNSUPPORTED_QUERY_SPEC`

### test: `EVENT_COUNT가 아닌 kind 또는 aggregation은 거부한다`

- Input: `kind: 'FUNNEL'` or `aggregation: 'UNIQUE_USERS'`
- Expected: `UNSUPPORTED_QUERY_SPEC`

### test: `filters 또는 groupBy가 비어 있지 않으면 거부한다`

- Input: valid shape with one filter or one groupBy
- Expected: `UNSUPPORTED_QUERY_SPEC`

### test: `timer_started가 아닌 eventType은 거부한다`

- Input: same shape with `eventType: 'timer_ended'`
- Expected: `UNSUPPORTED_QUERY_SPEC`

### test: `허용되지 않은 추가 필드가 있으면 거부한다`

- Input: valid shape plus an unexpected key
- Expected: `UNSUPPORTED_QUERY_SPEC`

## describe: `AmplitudeMetricSourceAdapter`

### test: `WEEKLY timer_started 수집 성공 결과를 반환한다`

- Setup:
  - metric definition key `timer_started`
  - period type `WEEKLY`, period key `2026-W17`
  - client returns `seriesCollapsed[0][0].value = 12`
- Expected:
  - result status is `success`
  - result value is `12`
  - result sampleSize is `12`
  - segment key/value are `ALL`
  - result period fields match input period
  - rawRef is present and sanitized

### test: `MONTHLY 기간 타입은 Amplitude 호출 없이 실패 처리한다`

- Setup:
  - period type `MONTHLY`
  - mocked client
- Expected:
  - result status is `failed`
  - reasonCode is `UNSUPPORTED_PERIOD_TYPE`
  - client is not called

### test: `성공 응답의 빈 결과는 0 스냅샷 후보로 변환한다`

- Setup:
  - client returns successful response with empty `seriesCollapsed`
- Expected:
  - result status is `success`
  - value is `0`
  - sampleSize is `0`

### test: `형식이 잘못된 응답은 실패 처리한다`

- Setup:
  - client returns `seriesCollapsed[0][0].value = 'not-a-number'`
- Expected:
  - result status is `failed`
  - reasonCode is `AMPLITUDE_RESPONSE_INVALID`

### test: `seriesCollapsed 구조가 배열이 아니면 실패 처리한다`

- Setup:
  - client returns `data.seriesCollapsed = 'not-an-array'`
- Expected:
  - result status is `failed`
  - reasonCode is `AMPLITUDE_RESPONSE_INVALID`

### test: `seriesCollapsed 내부 series 구조가 배열이 아니면 실패 처리한다`

- Setup:
  - client returns `data.seriesCollapsed = [{ value: 12 }]`
- Expected:
  - result status is `failed`
  - reasonCode is `AMPLITUDE_RESPONSE_INVALID`

### test: `Amplitude API 오류는 지표 실패 결과로 변환한다`

- Setup:
  - client rejects with safe API error status `429`
- Expected:
  - result status is `failed`
  - reasonCode is `AMPLITUDE_API_ERROR`
  - message includes `429`
  - message does not include credentials

## Mock Strategy

- Mock `AmplitudeClient`.
- Mock the KST date helper only when testing exact client parameters from the adapter.
- Use realistic fixture objects, not real HTTP calls.
