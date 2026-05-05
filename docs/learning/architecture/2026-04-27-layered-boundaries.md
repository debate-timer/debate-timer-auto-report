# 계층 분리와 결합도 낮추기

**Date**: 2026-04-27  
**Related Work**: Phase 1-2 Amplitude Adapter 구현  
**Related Issue**: [#7 Phase 1-2: Amplitude Adapter 구현](https://github.com/debate-timer/debate-timer-auto-report/issues/7)  
**Related Spec**: `specs/feat/007-amplitude-adapter/spec.md`

## 한 줄 요약

외부 API 조회 계층과 DB 저장 계층을 분리하면, Amplitude 응답 구조 변경과 스냅샷 저장 정책 변경이 서로 직접 영향을 주지 않는다.

## 배운 개념

- **결합도(Coupling)**: 한 모듈이 다른 모듈의 세부 구현을 얼마나 많이 알고 있는가.
- **응집도(Cohesion)**: 한 모듈이 하나의 책임에 얼마나 집중되어 있는가.
- **Adapter boundary**: 외부 시스템의 형식을 내부 표준 형식으로 바꾸는 경계.
- **Repository boundary**: DB 저장 방식과 쿼리 세부사항을 감추는 경계.

## 이 프로젝트에서의 문제

Phase 1-2는 Amplitude에서 `timer_started` 이벤트 카운트 1개를 조회하고 `metric_snapshots`에 저장해야 한다.

가장 단순하게는 `AmplitudeMetricSourceAdapter` 안에서 API 호출과 Prisma 저장을 모두 할 수 있다. 하지만 그렇게 하면 한 클래스가 아래 내용을 모두 알게 된다.

```text
AmplitudeMetricSourceAdapter
  ├─ Amplitude API endpoint
  ├─ Amplitude 인증 방식
  ├─ Amplitude 응답 구조
  ├─ MetricSnapshot 테이블 구조
  ├─ 중복 저장 정책
  └─ 추후 실행 이력 정책
```

이 구조는 빨리 만들 수는 있지만, 나중에 바뀌는 지점이 많아진다. Amplitude 응답 파싱을 고쳐도 저장 코드가 같이 흔들리고, 중복 저장 정책을 바꿔도 Amplitude 코드가 같이 수정된다.

## 선택한 구조

Phase 1-2에서는 역할을 두 계층으로 나눈다.

```text
metric-sources
  외부 지표 원천에서 값을 읽고 내부 표준 결과로 변환한다.

snapshots
  성공한 내부 표준 결과를 DB에 저장한다.
```

구조도는 다음과 같다.

```text
                Phase 1-3에서 붙을 실행 흐름
          수동 실행 API / cron / report run
                       │
                       ▼
        ┌────────────────────────────┐
        │ MetricSourceAdapter         │
        │ "지표 하나 수집해줘"          │
        └─────────────┬──────────────┘
                      │
                      ▼
        ┌────────────────────────────┐
        │ AmplitudeMetricSourceAdapter│
        │ Amplitude 조회 전담          │
        └─────────────┬──────────────┘
                      │
                      ▼
        ┌────────────────────────────┐
        │ Amplitude Dashboard API     │
        │ /api/2/events/segmentation  │
        └─────────────┬──────────────┘
                      │
                      ▼
        ┌────────────────────────────┐
        │ MetricCollectionResult      │
        │ success 또는 failed          │
        └─────────────┬──────────────┘
                      │
              success │ failed
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
┌──────────────────────┐   ┌──────────────────────┐
│ SnapshotsService      │   │ 저장하지 않음          │
│ 성공 결과만 저장       │   │ 실패 이유만 반환        │
└───────────┬──────────┘   └──────────────────────┘
            │
            ▼
┌──────────────────────┐
│ SnapshotsRepository   │
│ Prisma upsert 담당    │
└───────────┬──────────┘
            │
            ▼
┌──────────────────────┐
│ metric_snapshots      │
│ DB 저장               │
└──────────────────────┘
```

## 핵심 데이터 흐름

Amplitude 응답을 바로 DB 저장 코드에 넘기지 않는다. 먼저 우리 시스템의 표준 결과로 바꾼다.

```text
Amplitude 응답
  -> MetricCollectionResult
  -> SnapshotsService
  -> metric_snapshots
```

예시:

```typescript
{
  status: 'success',
  metricKey: 'timer_started',
  source: 'AMPLITUDE',
  periodType: 'WEEKLY',
  periodKey: '2026-W17',
  value: 12,
  sampleSize: 12,
  segmentKey: 'ALL',
  segmentValue: 'ALL'
}
```

이 표준 결과 덕분에 저장 계층은 Amplitude 응답의 `seriesCollapsed` 같은 세부 구조를 알 필요가 없다.

## 왜 이렇게 했나

변경 가능성이 높은 지점을 분리하기 위해서다.

```text
Amplitude API 응답 구조가 바뀐다
  -> metric-sources/amplitude만 수정

DB 저장 정책이 바뀐다
  -> snapshots만 수정

수동 실행, cron, Discord 전송이 붙는다
  -> Phase 1-3 실행 파이프라인만 수정

Sentry 같은 다른 원천이 추가된다
  -> 새로운 adapter를 추가하고 표준 결과 계약을 재사용
```

이 구조는 결합도를 낮추고 각 모듈의 응집도를 높인다.

## 대안

### 대안 A: Amplitude Adapter가 직접 Prisma 저장

```text
AmplitudeMetricSourceAdapter
  -> Amplitude API 호출
  -> 응답 파싱
  -> Prisma metricSnapshot.upsert
```

장점은 파일 수가 적고 초기 구현이 빠르다는 점이다.

단점은 외부 API 로직과 저장 정책이 강하게 묶인다는 점이다. Phase 1-3에서 실행 이력, 재실행, force 정책이 들어오면 Amplitude Adapter가 점점 비대해진다.

### 대안 B: 수집과 저장 계층 분리

```text
AmplitudeMetricSourceAdapter
  -> MetricCollectionResult
  -> SnapshotsService
  -> SnapshotsRepository
```

장점은 변경 범위가 작고 테스트가 쉽다는 점이다.

단점은 초기 파일 수가 조금 늘어난다는 점이다. 하지만 Phase 1-3과 Phase 4 확장을 고려하면 이 비용은 감당할 만하다.

## 테스트 관점

계층을 나누면 테스트도 더 명확해진다.

```text
Amplitude adapter test
  - Amplitude 응답 fixture를 표준 결과로 바꾸는지 확인
  - API 실패가 failed result가 되는지 확인
  - MONTHLY 요청을 아직 거부하는지 확인

Snapshots test
  - success result만 저장하는지 확인
  - failed result는 저장하지 않는지 확인
  - 중복 저장은 no-op upsert인지 확인
```

테스트에서 실제 Amplitude나 실제 DB를 호출하지 않아도 된다. 각 계층의 입력과 출력을 작게 고정할 수 있기 때문이다.

## Phase 1-2 구현에서 확인한 경계

이번 구현에서는 설계 문서의 경계가 실제 파일 구조로 이어졌다.

```text
src/modules/metric-sources/
  core/
    metric-source-adapter.ts
    metric-collection.types.ts
    metric-source.tokens.ts
  amplitude/
    amplitude.client.ts
    amplitude-query-spec.ts
    amplitude-metric-source.adapter.ts

src/modules/snapshots/
  snapshots.service.ts
  snapshots.repository.ts
```

실패 처리도 같은 경계를 따른다.

```text
Amplitude HTTP 실패
  -> AmplitudeClient가 credential 없는 안전한 error 생성
  -> AmplitudeMetricSourceAdapter가 MetricCollectionFailure로 변환
  -> SnapshotsService가 failed result를 skipped 처리
  -> SnapshotsRepository는 호출되지 않음
```

저장 직전에는 repository가 `rawRef`를 한 번 더 검사한다. Adapter나 client가 실수하더라도 DB 경계에서 `apiKey`, `secretKey`, `authorization` 같은 민감한 key를 차단하기 위한 방어선이다.

```text
MetricCollectionSuccess.rawRef
  -> SnapshotsRepository guard
  -> Prisma upsert
```

이 구조는 "외부 API 실패는 지표 실패로 격리하고, 실패한 값은 저장하지 않는다"는 요구사항을 파일 책임과 테스트 책임으로 나눠서 설명할 수 있게 한다.

## 면접에서 설명할 문장

“외부 API 조회와 DB 저장을 분리해 Amplitude 응답 구조가 저장 계층으로 새지 않게 했습니다. Adapter는 외부 응답을 내부 표준 결과로 바꾸고, Repository는 성공한 표준 결과만 저장하게 해서 변경 범위와 테스트 부담을 줄였습니다.”

## 관련 키워드

- coupling
- cohesion
- adapter pattern
- repository pattern
- dependency direction
- testability
- separation of concerns
