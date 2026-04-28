# TDD로 외부 API와 DB를 격리해 검증하기

**Date**: 2026-04-28  
**Related Work**: Phase 1-2 Amplitude Adapter 구현  
**Related Spec**: `specs/feat/007-amplitude-adapter/spec.md`  
**Related Tasks**: `specs/feat/007-amplitude-adapter/tasks.md`

## 한 줄 요약

외부 API와 DB를 직접 호출하지 않아도, 주입 가능한 경계와 mock을 사용하면 실패를 먼저 확인한 뒤 안전한 구현을 만들 수 있다.

## 이 프로젝트에서의 문제

Phase 1-2는 Amplitude에서 `timer_started` 이벤트 카운트를 가져와 `metric_snapshots`에 저장해야 했다. 하지만 테스트가 실제 Amplitude나 실제 PostgreSQL에 의존하면 문제가 생긴다.

- Amplitude credential이 필요하다.
- 네트워크 상태에 따라 테스트가 흔들린다.
- 외부 API rate limit이나 장애가 단위 테스트를 깨뜨릴 수 있다.
- DB 상태가 테스트 결과에 영향을 준다.
- 실패 케이스를 재현하기 어렵다.

그래서 단위 테스트는 외부 세계를 직접 부르지 않고, 우리 코드가 외부 세계를 어떻게 다룰지 검증해야 한다.

## 핵심 개념

- **TDD Red-Green**: 먼저 실패하는 테스트로 원하는 동작을 고정하고, 그 실패를 통과시키는 최소 구현을 작성한다.
- **External API isolation**: HTTP 호출을 직접 만들지 않고 주입 가능한 함수나 client 경계 뒤에 둔다.
- **Repository mock**: DB 저장은 repository 경계에서 Prisma 호출 모양만 검증하고 실제 DB는 사용하지 않는다.
- **Failure contract**: 예외를 그대로 흘려보내지 않고 `MetricCollectionFailure` 같은 표준 실패 결과로 바꾼다.

## 테스트 구조

이번 구현의 테스트 흐름은 다음과 같다.

```text
AmplitudeClient test
  -> injected fetch mock
  -> URL, Basic auth, checksum, non-2xx error 검증

AmplitudeMetricSourceAdapter test
  -> AmplitudeClient mock
  -> success result, MONTHLY failure, malformed response failure 검증

SnapshotsRepository test
  -> PrismaService.metricSnapshot.upsert mock
  -> compound unique key, update: {}, rawRef guard 검증

SnapshotsService test
  -> SnapshotsRepository mock
  -> success 저장 위임, failed skip 검증
```

전체 흐름은 다음처럼 끊어서 본다.

```text
실제 외부 세계
  Amplitude API       PostgreSQL
       ^                ^
       |                |
테스트 경계
  fetch mock       Prisma upsert mock
       ^                ^
       |                |
우리 코드
  AmplitudeClient  SnapshotsRepository
       |                ^
       v                |
  AmplitudeMetricSourceAdapter
       |
       v
  MetricCollectionResult
```

## RED에서 확인한 것

테스트를 먼저 추가했을 때 실패는 다음처럼 나뉘었다.

```text
KST helper
  -> 빈 문자열 반환 때문에 YYYYMMDD 기대값과 불일치

AmplitudeClient
  -> not implemented
  -> non-2xx를 성공처럼 처리

AmplitudeMetricSourceAdapter
  -> MONTHLY를 실패로 막지 못함
  -> malformed response를 0 성공으로 처리
  -> client error를 표준 실패 결과로 변환하지 못함

SnapshotsService
  -> failed result를 skipped로 반환하지 않고 throw

SnapshotsRepository
  -> rawRef의 Authorization key를 저장 전에 차단하지 못함
```

이 실패들은 "테스트가 정말 구현 공백을 잡고 있다"는 증거다. 테스트가 처음부터 통과했다면 원하는 동작을 검증하는 테스트인지 확신하기 어렵다.

## 선택한 방식

### 1. fetch를 token으로 주입

`AmplitudeClient`는 전역 `fetch`를 직접 고정하지 않고 `AMPLITUDE_FETCH` token으로 받는다.

```text
MetricSourcesModule
  AMPLITUDE_FETCH -> fetch

테스트
  AMPLITUDE_FETCH -> jest.fn()
```

이렇게 하면 테스트에서 URL, header, 실패 응답을 모두 제어할 수 있다.

### 2. Prisma는 repository 뒤에 둠

`SnapshotsRepository`만 Prisma upsert를 안다. Service와 Adapter는 Prisma unique key 이름을 알 필요가 없다.

```text
SnapshotsService
  -> saveCollectionResult(result)
  -> SnapshotsRepository.upsertCollectionSuccess(result)
  -> prisma.metricSnapshot.upsert(...)
```

Repository 테스트는 실제 DB 대신 `metricSnapshot.upsert` mock을 사용해 입력 모양을 검증한다.

### 3. 실패는 표준 결과로 변환

외부 API 실패나 unsupported period는 가능한 한 호출자에게 안전한 실패 결과로 돌려준다.

```typescript
{
  status: 'failed',
  metricKey: 'timer_started',
  reasonCode: 'AMPLITUDE_API_ERROR',
  message: 'Amplitude API request failed with status 429'
}
```

이 결과에는 API key, secret key, Authorization header, Webhook URL을 넣지 않는다.

## 대안

### 대안 A: 실제 Amplitude와 실제 DB를 연결해 테스트

장점은 실제 환경과 가까운 검증이 가능하다는 점이다.

단점은 credential, 네트워크, DB 상태에 따라 테스트가 흔들리고 실패 케이스를 재현하기 어렵다는 점이다. 단위 테스트에는 맞지 않는다.

### 대안 B: 경계를 mock하고 단위 테스트로 계약을 검증

장점은 빠르고 안정적이며 실패 케이스를 정확히 만들 수 있다는 점이다.

단점은 실제 DB 연결이나 Prisma migration 상태까지 증명하지는 못한다. 그래서 가능한 환경에서는 별도 smoke check가 필요하다.

이번 Phase에서는 대안 B를 선택했고, 로컬 PostgreSQL이 응답하지 않아 실제 DB smoke check는 blocker로 기록했다.

## Learning Mode에서 놓치기 쉬운 지점

이 구현은 사용자가 직접 작성해볼 수 있는 작은 학습 포인트가 많았다.

```text
formatKstDate(date)
  -> +9시간 후 YYYYMMDD 만들기

extractEventCount(body)
  -> unknown 값을 안전하게 좁혀 number인지 확인하기

containsSensitiveKey(value)
  -> 객체/배열을 재귀 순회하며 민감한 key 찾기
```

특히 `containsSensitiveKey`는 타입 좁히기, 재귀, 보안 guard, 테스트가 함께 들어가므로 5-10줄 학습 과제로 적합하다.

## 면접에서 설명할 문장

“Amplitude와 PostgreSQL을 단위 테스트에서 직접 호출하지 않고, fetch와 Prisma repository를 주입 가능한 경계로 분리했습니다. RED 단계에서 API 실패, malformed response, failed result skip, rawRef 민감정보 차단을 먼저 실패로 확인했고, GREEN 단계에서 표준 실패 결과와 no-op upsert 계약을 구현해 외부 의존성 없이 안정적으로 검증했습니다.”

## 관련 키워드

- TDD
- RED-GREEN
- external API mocking
- repository pattern
- dependency injection token
- failure contract
- sensitive data redaction
- smoke test blocker
