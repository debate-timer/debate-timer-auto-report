# Test Contract: KST date helper

**File**: `src/common/time/kst-date.spec.ts`  
**Test target**: `src/common/time/kst-date.ts`

## describe: `KST 날짜 포맷`

### test: `UTC Date를 KST YYYYMMDD 문자열로 변환한다`

- Input: `new Date('2026-04-19T15:00:00.000Z')`
- Expected: `'20260420'`
- Reason: This is Monday 00:00:00 in Asia/Seoul.

### test: `exclusive periodEnd에서 Amplitude end 날짜를 계산한다`

- Input: `new Date('2026-04-26T15:00:00.000Z')`
- Expected: `'20260426'`
- Reason: Weekly period end is exclusive next Monday 00:00 KST, but Amplitude end date is inclusive Sunday.

### test: `서버 로컬 타임존에 의존하지 않는다`

- Input: `new Date('2026-01-04T15:00:00.000Z')`
- Expected start date: `'20260105'`
- Expected exclusive-end previous date for `new Date('2026-01-11T15:00:00.000Z')`: `'20260111'`
- Reason: Use UTC getters after adding the fixed KST offset.

### test: `유효하지 않은 Date는 즉시 거부한다`

- Input: `new Date('not-a-date')`
- Expected:
  - `formatKstDate(...)` throws a clear validation error
  - `formatAmplitudeEndDateFromExclusiveEnd(...)` throws a clear validation error
- Reason: Invalid period boundaries must fail early instead of producing bogus Amplitude date strings.

## Mock Strategy

No mocks. These are pure functions.
