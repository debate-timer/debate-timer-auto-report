# Feature Specification: Phase 1-2 Amplitude Adapter 구현

**Feature Branch**: `feat/#7`  
**Created**: 2026-04-27  
**Status**: Draft  
**GitHub Issue**: [#7 Phase 1-2: Amplitude Adapter 구현](https://github.com/debate-timer/debate-timer-auto-report/issues/7)  
**Input**: User description: "phase 1-2를 진행하자. 기존에 이미 있는 issue를 이용해."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Amplitude 지표 조회 분리 (Priority: P1)

개발자는 Amplitude API 호출 세부사항을 애플리케이션의 나머지 지표 수집 흐름과 분리된 어댑터 뒤에 숨길 수 있다. 시스템은 `timer_started` 지표 정의와 주간 대상 기간을 받아 Amplitude에서 이벤트 발생 횟수를 조회하고, 내부 표준 결과로 변환한다.

**Why this priority**: Phase 1-2의 핵심은 외부 의존성을 `MetricSourceAdapter` 경계로 분리하는 것이다. 이 경계가 있어야 Phase 9에서 Sentry 계층을 추가할 때 Amplitude 구현을 건드리지 않고 확장할 수 있다.

**Independent Test**: Amplitude 성공 응답 fixture를 사용해 `timer_started` 지표와 주간 대상 기간을 조회했을 때, 외부 응답이 내부 표준 지표 수집 결과로 변환되는지 확인한다.

**Acceptance Scenarios**:

1. **Given** 활성 `timer_started` 지표 정의와 KST 기준 주간 대상 기간이 있고, **When** 시스템이 Amplitude 지표 조회를 요청하면, **Then** Amplitude 조회 결과가 지표 키, 원천, 기간, 값, 표본 수를 포함한 내부 표준 결과로 반환된다.
2. **Given** 지표 정의의 조회 명세가 Amplitude 이벤트 카운트 형식이고, **When** 어댑터가 조회를 수행하면, **Then** `timer_started` 이벤트 발생 횟수만 조회 대상으로 사용된다.
3. **Given** Amplitude 응답에 원천 응답을 추적할 수 있는 참조 정보가 있고, **When** 조회 결과가 변환되면, **Then** 시스템은 민감정보를 제외한 원천 참조 정보를 내부 결과에 포함한다.

---

### User Story 2 - 조회 결과 스냅샷 저장 (Priority: P2)

시스템은 Amplitude에서 조회한 `timer_started` 값을 `metric_snapshots`에 저장하여 이후 비교, 리포트 생성, 재실행 검증에서 같은 기간의 지표 값을 재사용할 수 있다.

**Why this priority**: Walking Skeleton은 실제 외부 지표가 DB에 남는 순간부터 검증 가능해진다. 스냅샷 저장이 완료되어야 Phase 1-3의 실행 파이프라인과 Discord 전송이 같은 데이터 경로를 사용할 수 있다.

**Independent Test**: mocked Prisma upsert를 사용해 `timer_started` 조회 성공 결과가 `metric_snapshots` 저장 입력으로 정확히 매핑되고 no-op 중복 저장 정책을 사용하는지 확인한다. 로컬 PostgreSQL이 사용 가능하면 동일 지표·기간·세그먼트의 레코드가 1개만 유지되는지 smoke check로 추가 확인한다.

**Acceptance Scenarios**:

1. **Given** `timer_started` 조회 성공 결과가 있고, **When** 시스템이 조회 결과를 저장하면, **Then** repository는 `metric_snapshots`의 해당 지표·기간·전체 세그먼트 upsert 입력을 정확히 구성한다.
2. **Given** 같은 지표·기간·세그먼트의 스냅샷 저장 요청이 다시 들어오고, **When** repository가 upsert를 구성하면, **Then** 시스템은 no-op update를 사용해 동일 키의 스냅샷을 그대로 유지한다. 이미 저장된 값은 덮어쓰지 않는다.
3. **Given** 저장된 스냅샷을 조회할 때, **When** 후속 단계가 지표 키와 기간으로 검색하면, **Then** 저장된 값, 표본 수, 수집 시각, 원천 참조 정보를 확인할 수 있다.

---

### User Story 3 - 지표 단위 실패 격리 (Priority: P3)

Amplitude API 호출이 실패하거나 응답을 해석할 수 없는 경우에도 시스템은 실패한 지표를 명확히 표시하고, 이후 여러 지표로 확장될 때 전체 실행이 한 지표 실패에 묶이지 않도록 한다.

**Why this priority**: 이슈 #7은 "Amplitude API 호출 실패 시 해당 지표만 실패 처리"를 명시한다. Phase 1-2에서는 지표가 1개뿐이지만, 실패 결과 모델을 먼저 고정해야 Phase 3-4 확장 시 호출 실패 처리가 흔들리지 않는다.

**Independent Test**: Amplitude 실패 응답 또는 네트워크 오류를 모의했을 때, 시스템이 스냅샷을 저장하지 않고 실패한 지표 키와 실패 사유를 포함한 결과를 반환하는지 확인한다.

**Acceptance Scenarios**:

1. **Given** Amplitude API가 인증 오류, 제한 초과, 네트워크 오류 중 하나로 실패하고, **When** 시스템이 `timer_started` 수집을 시도하면, **Then** 해당 지표는 실패 결과로 표시되고 실패 사유가 기록된다.
2. **Given** Amplitude 응답 형식이 예상과 다르고, **When** 시스템이 응답을 변환하려 하면, **Then** 시스템은 잘못된 값을 스냅샷으로 저장하지 않고 변환 실패로 처리한다.
3. **Given** 특정 지표 조회가 실패한 상태에서, **When** 수집 결과가 호출자에게 반환되면, **Then** 호출자는 성공 지표와 실패 지표를 구분할 수 있다.

---

### Edge Cases

- Amplitude 인증 정보가 누락된 경우 애플리케이션 시작 시 환경변수 검증에서 실패한다.
- Amplitude 인증 정보가 존재하지만 잘못된 경우, Amplitude API 응답을 지표 단위 실패 결과로 변환하고 민감한 키 값은 로그나 저장 데이터에 남기지 않는다.
- Amplitude가 성공 응답 안에서 빈 결과를 반환하는 경우, 시스템은 조회 실패가 아니라 값 0으로 해석하고 `value=0`, `sampleSize=0` 스냅샷을 저장한다.
- 대상 기간 경계는 KST 기준으로 해석하되 저장되는 기간 시작·종료 시각은 기존 DB 모델처럼 UTC `DateTime`으로 유지한다.
- Phase 1-2에서 월간 기간 타입이 요청되면 시스템은 Amplitude 호출과 스냅샷 저장을 수행하지 않고 지원하지 않는 기간 타입으로 실패 처리한다.
- 동일 지표·기간·세그먼트의 스냅샷 중복 저장 요청은 `metric_snapshots`의 유니크 키 정책과 충돌하지 않아야 한다.
- 지표 정의의 `querySpec`이 Phase 1-2에서 지원하는 형식(`kind: "EVENT_COUNT"`, `source: "AMPLITUDE"`)이 아니면 Amplitude 호출을 시도하지 않고 명확한 실패 결과를 반환한다.
- Amplitude 호출이 응답 없이 지연되면 시스템은 무기한 대기하지 않고 지표 단위 실패로 변환한다.
- Amplitude 성공 응답의 JSON 본문이 파싱되지 않거나 `seriesCollapsed` 구조가 손상된 경우, 시스템은 0건 성공이 아니라 응답 형식 오류로 처리한다.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 시스템은 `MetricSourceAdapter` 인터페이스를 제공해야 하며, 지표 정의와 대상 기간을 입력받아 지표별 수집 결과를 반환할 수 있어야 한다.
- **FR-002**: 시스템은 `AmplitudeMetricSourceAdapter`를 제공해야 하며, `timer_started` 이벤트 카운트를 Amplitude에서 조회할 수 있어야 한다.
- **FR-003**: 시스템은 Amplitude 원천 응답을 내부 표준 지표 수집 결과로 변환해야 하며, 결과에는 지표 키, 원천, 기간 유형, 기간 키, 기간 시작·종료, 세그먼트, 값, 표본 수(count 지표의 경우 value와 동일), 조회 명세 버전이 포함되어야 한다. 원천 참조 정보는 Phase 1-1 data-model.md §MetricSnapshot.rawRef 구조(`version`, `source`, `endpoint`, `requestId`, `responseChecksum`)를 따르며, API Key·Authorization header는 포함하지 않는다.
- **FR-004**: 시스템은 성공한 `timer_started` 수집 결과를 `metric_snapshots`에 저장해야 한다.
- **FR-005**: 시스템은 같은 지표 정의, 기간 유형, 기간 키, 세그먼트 키, 세그먼트 값에 대해 스냅샷을 중복 생성하지 않아야 한다.
- **FR-006**: 시스템은 Amplitude 조회 실패 시 실패한 지표의 키와 실패 사유를 포함한 실패 결과를 반환해야 하며, 성공하지 않은 값을 스냅샷으로 저장하지 않아야 한다.
- **FR-007**: 시스템은 Amplitude 인증 정보, Authorization header, Webhook URL 같은 민감정보를 로그, 스냅샷, 원천 참조 정보에 저장하지 않아야 한다.
- **FR-008**: 시스템은 Phase 1-2 범위를 `timer_started` 단일 지표와 전체 세그먼트(`ALL`) 저장으로 제한해야 한다.
- **FR-009**: 시스템은 실행 API, cron 등록, Discord 전송, 리포트 생성, 실행 이력 상태 전이를 Phase 1-2 범위에 포함하지 않아야 한다.
- **FR-010**: 시스템은 Phase 1-2에서 주간 기간 타입(`WEEKLY`)만 수집·저장해야 하며, 월간 기간 타입(`MONTHLY`) 요청은 지원하지 않는 기간 타입으로 실패 처리해야 한다.
- **FR-011**: 시스템의 수집 결과와 스냅샷 저장 계약은 `periodType` 필드를 유지해야 하며, Phase 1-3에서 `MONTHLY` 수집이 추가될 때 기존 저장 모델을 변경하지 않아도 되어야 한다.
- **FR-012**: 시스템은 Amplitude가 성공 응답 안에서 빈 결과를 반환하면 이를 실패가 아닌 0건 수집 성공으로 처리하고, `value=0`, `sampleSize=0` 스냅샷을 저장해야 한다.
- **FR-013**: 시스템은 Amplitude 호출에 제한 시간을 적용해야 하며, timeout 발생 시 안전한 지표 단위 실패 결과로 변환할 수 있어야 한다.
- **FR-014**: 시스템은 Phase 1-2 `querySpec`을 정확한 key 집합으로 검증해야 하며, 허용되지 않은 추가 필드나 `timer_started` 외 `eventType`을 거부해야 한다.
- **FR-015**: 시스템은 `rawRef` 저장 직전에 민감정보 key 변형을 재귀적으로 검사하고, `api_key`, `accessToken`, `refresh-token`, `password` 같은 credential 계열 key가 있으면 저장을 중단해야 한다.

### Key Entities

- **Metric Source Adapter**: 외부 지표 원천에서 값을 조회하는 경계. 지표 정의와 대상 기간을 입력받고, 성공 또는 실패 수집 결과를 반환한다.
- **Amplitude Metric Source Adapter**: Amplitude 이벤트 카운트 조회를 담당하는 구현체. Phase 1-2에서는 `timer_started` 이벤트 카운트만 지원한다.
- **Metric Collection Result**: 지표 수집의 성공 또는 실패 결과. 성공 결과는 스냅샷 저장에 필요한 표준 필드를 포함하고, 실패 결과는 지표 키와 실패 사유를 포함한다.
- **Metric Snapshot**: 특정 지표·기간·세그먼트의 수집값. Phase 1-1에서 정의한 `metric_snapshots` 저장 모델을 그대로 사용한다.
- **Metric Definition**: 수집 대상 지표의 정의. Phase 1-2는 seed로 등록된 `timer_started`의 `querySpec`을 조회 명세로 사용한다.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Amplitude 성공 응답 fixture 기준으로 `timer_started` 조회 결과가 내부 표준 결과로 변환되는 단위 테스트가 통과한다.
- **SC-002**: 단위 테스트에서 `timer_started` 수집 성공 결과가 `metric_snapshots` upsert 입력으로 정확히 매핑됨을 검증한다. 로컬 PostgreSQL이 사용 가능하면 실제 저장 smoke check로 동일 지표·기간·전체 세그먼트 레코드가 1개 생성됨을 추가 확인한다.
- **SC-003**: 단위 테스트에서 동일 지표·기간·전체 세그먼트 저장이 no-op upsert를 사용함을 검증한다. 로컬 PostgreSQL이 사용 가능하면 동일 수집 2회 실행 후 중복 스냅샷이 생성되지 않음을 추가 확인한다.
- **SC-004**: Amplitude API 실패 또는 응답 변환 실패 시 스냅샷이 저장되지 않고 실패 결과가 반환되는 테스트가 통과한다.
- **SC-005**: Phase 1-2 구현 후 기존 Phase 1-1의 config, health, prisma 관련 테스트가 계속 통과한다.
- **SC-006**: Amplitude API Key, Secret Key, Authorization header가 `rawRef`, 로그 출력, `metric_snapshots` 어느 필드에도 저장되지 않음을 검증하는 단위 테스트가 통과한다.
- **SC-007**: `MONTHLY` 기간 타입으로 `timer_started` 수집을 요청하면 Amplitude 호출과 스냅샷 저장 없이 지원하지 않는 기간 타입 실패 결과가 반환되는 테스트가 통과한다.
- **SC-008**: Amplitude가 성공 응답 안에서 빈 결과를 반환하면 `value=0`, `sampleSize=0` 스냅샷이 저장되는 테스트가 통과한다.
- **SC-009**: Amplitude timeout, malformed JSON, 손상된 `seriesCollapsed` 구조가 안전한 실패로 변환되는 단위 테스트가 통과한다.
- **SC-010**: raw response text 기준 checksum, strict querySpec key 검증, invalid Date 거부 테스트가 통과한다.

## Assumptions

- Phase 1-2는 로컬 개발 환경 기준으로 검증한다.
- Phase 1-1의 Prisma 모델과 `timer_started` seed는 이미 준비되어 있다고 가정한다.
- 필수 환경변수 누락은 지표 수집 단계가 아니라 애플리케이션 시작 시 config validation에서 차단한다.
- 대상 기간은 호출자가 명시적으로 전달한다. 수동 실행 API, cron, 기본 대상 기간 계산은 Phase 1-3에서 다룬다.
- Phase 1-2의 지표 범위는 `timer_started` 1개, 기간 타입은 주간(`WEEKLY`) 1개, 세그먼트는 전체 세그먼트(`ALL`)만 저장한다.
- Phase 1-3에서는 같은 수집 결과와 스냅샷 저장 계약 위에 월간(`MONTHLY`) 기간 타입을 확장할 수 있어야 한다.
- Amplitude 호출 실패 재시도, 호출량 제한 배치 전략, 다중 지표 조회는 Phase 4에서 확장한다.
- `sampleSize`는 Phase 1-2에서 이벤트 카운트와 동일한 값으로 저장한다. 실제 사용자 수 또는 고유 사용자 수 기반 표본 정의는 후속 지표 확장 단계에서 별도 확정한다.

## Clarifications

### Session 2026-04-27

- Q: 브랜치 이름은 기존 spec slug 포함 방식(`feat/#7-amplitude-adapter`)과 이슈 본문 방식(`feat/#7`) 중 무엇을 사용할까? -> A: 이슈 본문 기준인 `feat/#7`로 진행한다.
- Q: Phase 1-2에서 지원할 기간 타입은 무엇인가? -> A: `WEEKLY`만 지원하되, Phase 1-3에서 `MONTHLY`로 확장 가능해야 한다.
- Q: Amplitude 성공 응답이 빈 결과를 반환하면 어떻게 처리할까? -> A: 성공 스냅샷으로 저장하며 `value=0`, `sampleSize=0`을 기록한다.
