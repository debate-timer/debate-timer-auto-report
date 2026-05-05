# Test Contract: Amplitude HTTP Client

**File**: `src/modules/metric-sources/amplitude/amplitude.client.spec.ts`  
**Test target**: `src/modules/metric-sources/amplitude/amplitude.client.ts`

## describe: `AmplitudeClient`

### test: `Event Segmentation URL을 구성한다`

- Setup:
  - `eventType = 'timer_started'`
  - `startDate = '20260420'`
  - `endDate = '20260426'`
  - mocked fetch returns HTTP 200 with `{ data: { seriesCollapsed: [[{ value: 12 }]] } }`
- Expected:
  - request URL path is `/api/2/events/segmentation`
  - query includes `e={"event_type":"timer_started"}`
  - query includes `start=20260420`
  - query includes `end=20260426`
  - query includes `m=totals`
  - query includes `i=7`

### test: `Basic Authorization header를 설정하지만 결과에는 저장하지 않는다`

- Setup:
  - `AMPLITUDE_API_KEY = 'api-key'`
  - `AMPLITUDE_SECRET_KEY = 'secret-key'`
  - mocked fetch returns HTTP 200
- Expected:
  - fetch receives an `Authorization` header starting with `Basic `
  - returned `rawRef` does not contain `api-key`
  - returned `rawRef` does not contain `secret-key`
  - returned `rawRef` does not contain `Authorization`

### test: `성공 응답에 checksum과 endpoint rawRef를 포함한다`

- Setup:
  - mocked fetch returns HTTP 200 with a stable JSON body
- Expected:
  - `rawRef.version` is `1`
  - `rawRef.source` is `AMPLITUDE`
  - `rawRef.endpoint` is `/api/2/events/segmentation`
  - `rawRef.responseChecksum` starts with `sha256:`

### test: `checksum은 재직렬화 JSON이 아니라 원본 응답 문자열 기준으로 계산한다`

- Setup:
  - mocked fetch returns HTTP 200 with JSON text that contains whitespace
- Expected:
  - `rawRef.responseChecksum` is the SHA-256 digest of the raw response text
  - checksum is not based on `JSON.stringify(parsedBody)`

### test: `성공 HTTP 응답의 JSON 파싱 실패는 AmplitudeApiError로 변환한다`

- Setup:
  - mocked fetch returns HTTP 200 with malformed JSON text
- Expected:
  - client rejects with `AmplitudeApiError`
  - error message is safe and does not include credentials

### test: `Amplitude 호출이 타임아웃되면 안전한 API 에러로 변환한다`

- Setup:
  - mocked fetch never resolves until its `AbortSignal` is aborted
- Expected:
  - client passes an `AbortSignal` to fetch
  - client rejects with a safe timeout `AmplitudeApiError`

### test: `Amplitude HTTP 실패를 안전한 에러로 반환한다`

- Setup:
  - mocked fetch returns HTTP 401
- Expected:
  - client rejects with an error carrying status `401`
  - error message does not include API key or secret key

### test: `fetch 예외를 안전한 에러로 반환한다`

- Setup:
  - mocked fetch rejects with `new Error('network down')`
- Expected:
  - client rejects with a safe Amplitude API error
  - error message includes `network down`
  - error object does not include credentials

## Mock Strategy

- Replace `AMPLITUDE_FETCH` with `jest.fn()`.
- Stub `ConfigService.getOrThrow` for `AMPLITUDE_API_KEY` and `AMPLITUDE_SECRET_KEY`.
- Do not call real Amplitude.
