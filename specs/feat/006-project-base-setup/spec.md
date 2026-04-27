# Feature Specification: Phase 1-1 프로젝트 기반 구성

**Feature Branch**: `feat/#6-project-base-setup`  
**Created**: 2026-04-23  
**Status**: Ready for implementation  
**GitHub Issue**: [#6 Phase 1-1: 프로젝트 기반 구성](https://github.com/debate-timer/debate-timer-auto-report/issues/6)

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 환경 설정 오류 즉시 감지 (Priority: P1)

개발자가 `.env` 파일에 잘못된 값 또는 누락된 필수 항목을 넣고 서비스를 기동하면, 서비스가 실제 실행되기 전에 명확한 오류 메시지와 함께 종료된다.

**Why this priority**: 잘못된 환경 설정으로 서비스가 기동된 채 이후 기능이 추가되면 문제 발생 시점을 추적하기 어렵다. 기동 시점에 검증함으로써 이후 모든 모듈이 올바른 설정 위에서 동작할 수 있다.

**Independent Test**: `.env`에서 필수 환경변수(`DATABASE_URL` 등)를 제거한 후 서비스를 기동했을 때, 기동이 실패하고 어떤 값이 누락됐는지 표시되는지 확인.

**Acceptance Scenarios**:

1. **Given** `DATABASE_URL`이 비어 있는 상태에서, **When** 서비스를 기동하면, **Then** 서비스가 실행을 중단하고 "DATABASE_URL is required" 형태의 메시지를 출력한다.
2. **Given** 모든 필수 환경변수가 정확히 설정된 상태에서, **When** 서비스를 기동하면, **Then** 서비스가 정상적으로 실행된다.
3. **Given** 잘못된 형식의 값(예: `DATABASE_URL`에 URL이 아닌 문자열)이 설정된 상태에서, **When** 서비스를 기동하면, **Then** 형식 오류와 해당 항목 이름을 포함한 오류 메시지가 출력된다.

---

### User Story 2 - 서비스 상태 확인 (Priority: P2)

운영자 또는 모니터링 시스템이 서비스가 살아 있는지 확인하기 위해 상태 확인 요청을 보내면, 즉시 정상 응답을 받을 수 있다.

**Why this priority**: 이후 단계에서 추가될 스케줄러, Discord 전송 등 모든 기능은 서비스가 정상 동작 중임을 전제로 한다. 상태 확인 엔드포인트가 있어야 배포 검증과 장애 감지가 가능하다.

**Independent Test**: 서비스 기동 후 `/health` 경로로 요청을 보냈을 때, 서비스가 정상임을 나타내는 응답이 200 상태코드와 함께 반환되는지 확인.

**Acceptance Scenarios**:

1. **Given** 서비스가 정상 기동된 상태에서, **When** `/health` 엔드포인트에 요청하면, **Then** HTTP 200과 함께 서비스 상태가 `ok`임을 나타내는 응답이 반환된다.
2. **Given** 서비스가 기동 중인 상태에서, **When** `/health`에 반복 요청을 보내면, **Then** 매 요청마다 일관된 형태의 정상 응답이 반환된다.

---

### User Story 3 - 구조화된 로그 출력 (Priority: P3)

개발자가 서비스 실행 중 발생한 이벤트(요청 수신, 오류 발생 등)를 확인하려 할 때, 각 로그 항목이 타임스탬프·로그 레벨·메시지를 포함한 구조화된 형태로 출력된다.

**Why this priority**: 이후 Phase에서 지표 수집·분석·전송 과정의 오류를 추적하려면 구조화된 로그가 필수적이다. 초기부터 적용하면 이후 디버깅 비용이 크게 감소한다.

**Independent Test**: 서비스 기동 후 `/health`에 요청을 보냈을 때, 터미널(또는 파일)에 JSON 형태의 로그 항목이 출력되고 타임스탬프·레벨·경로 정보가 포함되어 있는지 확인.

**Acceptance Scenarios**:

1. **Given** 서비스가 기동된 상태에서, **When** HTTP 요청이 수신되면, **Then** 해당 요청의 메서드·경로·응답 코드·처리 시간이 하나의 로그 항목으로 기록된다.
2. **Given** `LOG_LEVEL=debug`로 설정된 상태에서, **When** 서비스가 실행되면, **Then** debug 이상의 모든 로그가 출력된다.
3. **Given** `LOG_LEVEL=warn`으로 설정된 상태에서, **When** 서비스가 실행되면, **Then** warn·error 수준의 로그만 출력된다.

---

### User Story 4 - 핵심 데이터 저장 기반 준비 (Priority: P4)

시스템이 지표 정의, 지표 스냅샷, 실행 이력, 전송 이력을 저장할 수 있는 저장소가 마련되어, 이후 지표 수집·리포트 전송 기능이 데이터를 영속적으로 관리할 수 있다.

**Why this priority**: Walking Skeleton의 이후 단계(Phase 1-2, 1-3)에서 실제 데이터를 읽고 쓰는 작업이 진행된다. 이 저장 기반이 없으면 이후 기능을 구현할 수 없다.

**Independent Test**: DB 연결 후 `metric_definitions`, `metric_snapshots`, `report_runs`, `deliveries` 테이블이 존재하는지, 그리고 각 테이블에 데이터를 삽입·조회할 수 있는지 확인.

**Acceptance Scenarios**:

1. **Given** DB 서버가 실행 중이고 연결 정보가 올바른 상태에서, **When** 서비스가 기동되면, **Then** 4개 핵심 테이블이 모두 존재한다.
2. **Given** 테이블이 생성된 상태에서, **When** 지표 정의 레코드를 저장하면, **Then** 조회 시 동일한 값이 반환된다.
3. **Given** DB 연결 정보가 잘못된 상태에서, **When** 서비스를 기동하면, **Then** DB 연결 실패 오류와 함께 서비스가 종료된다.

---

### User Story 5 - 초기 지표 데이터 존재 (Priority: P5)

시스템이 처음 초기화될 때, 기본 지표(`timer_started`)가 자동으로 등록되어 이후 단계에서 별도의 수동 입력 없이 지표 수집을 시작할 수 있다.

**Why this priority**: Phase 1-2에서 Amplitude Adapter가 `timer_started` 지표를 조회하려면 해당 지표의 정의가 DB에 미리 존재해야 한다.

**Independent Test**: 새 환경에서 서비스를 초기화한 직후 `metric_definitions` 테이블에서 `timer_started` 키의 레코드가 존재하는지 확인.

**Acceptance Scenarios**:

1. **Given** 빈 데이터베이스에서 초기화가 실행된 상태에서, **When** 지표 정의 목록을 조회하면, **Then** `timer_started` 키를 가진 활성 지표 정의가 1개 존재한다.
2. **Given** 이미 `timer_started`가 등록된 상태에서, **When** 초기화가 재실행되면, **Then** 중복 등록 없이 기존 레코드가 유지된다.

---

### Edge Cases

- 서비스 기동 중 DB 서버가 일시적으로 응답하지 않으면 어떻게 처리되는가?
- 동일 환경에서 초기화가 두 번 실행될 때(예: 재배포) 기존 seed 데이터가 덮어쓰여지거나 중복 생성되지 않는가?
- 환경변수 파일이 존재하지 않을 때 서비스 기동이 명확한 안내와 함께 실패하는가?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 서비스는 기동 시점에 필수 환경변수의 존재 여부와 형식을 검증하고, 검증 실패 시 명확한 오류 메시지와 함께 기동을 중단해야 한다.
- **FR-002**: 서비스는 `/health` 경로에서 서비스 정상 동작 여부를 응답하는 엔드포인트를 제공해야 한다.
- **FR-003**: 서비스는 모든 HTTP 요청과 오류 이벤트를 구조화된 형태(타임스탬프·레벨·메시지 포함)로 기록해야 한다.
- **FR-004**: 로그 수준은 환경변수(`LOG_LEVEL`)로 조정 가능해야 하며, 기본값은 `info`다.
- **FR-005**: 서비스는 `metric_definitions`, `metric_snapshots`, `report_runs`, `deliveries` 테이블을 갖춘 데이터 저장소에 연결되어야 한다.
- **FR-006**: 서비스는 초기화 시 `timer_started` 지표 정의를 저장소에 등록하되, 이미 존재하는 경우 중복 생성하지 않아야 한다.
- **FR-007**: DB 연결에 실패할 경우 서비스는 연결 오류를 명확히 기록하고 기동을 중단해야 한다.

### Key Entities

- **지표 정의 (Metric Definition)**: 수집 대상 지표를 식별하는 레코드. 지표 키, 이름, 설명, 데이터 원천, 단위, 버전 있는 조회 스펙, 방향성(높을수록 좋음/낮을수록 좋음), 최소 표본 크기, 버전 있는 경고 규칙, 활성화 여부를 포함한다.
- **지표 스냅샷 (Metric Snapshot)**: 특정 기간의 지표 수집값. 지표 정의와 연결되며 데이터 원천, 기간 유형(주간/월간), KST 기준 기간 키, UTC 기간 시작·종료, 세그먼트 키/값, 수집값, 표본 크기, 원천 응답 참조를 포함한다.
- **실행 이력 (Report Run)**: 리포트 실행 단위. 실행 유형, 대상 기간 키, 리포트 버전, 멱등성 키, 상태(대기/실행 중/완료/실패), 트리거 유형(스케줄/수동)을 포함한다.
- **전송 이력 (Delivery)**: 외부 채널(Discord)로의 전송 시도 기록. 채널 유형, 채널 대상 식별자, 전송 상태, 시도 횟수, 전송 시각, 응답 참조, 오류 요약을 포함한다. 채널 대상에는 Webhook URL 같은 민감정보를 저장하지 않는다.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 필수 환경변수가 누락된 상태에서 서비스 기동 시 5초 이내에 명확한 오류 메시지와 함께 종료된다.
- **SC-002**: `/health` 엔드포인트가 100ms 이내에 응답을 반환한다.
- **SC-003**: 서비스 기동 후 발생하는 모든 HTTP 요청이 빠짐없이 로그 항목으로 기록된다.
- **SC-004**: 새 환경에서 초기화 완료 시 4개 핵심 테이블과 1개의 기본 지표(`timer_started`)가 자동으로 생성된다.
- **SC-005**: 초기화를 반복 실행해도 seed 데이터가 중복 생성되지 않는다.

## Assumptions

- 로컬 개발 환경 기준이며, 운영 배포 설정(컨테이너 이미지, CI/CD)은 이번 단계의 범위가 아니다.
- PostgreSQL 서버는 외부에서 미리 준비된다고 가정한다. DB 서버 자체의 설치·관리는 이번 단계에 포함되지 않는다.
- Discord Webhook 전송은 Phase 1-3에서 구현되므로 이번 단계에서는 DB 연결 및 저장 기반만 검증한다.
- DB 연결 재시도 정책은 **Phase 1-1 범위 외**다. 로컬 환경에서는 DB가 항상 준비돼 있다고 전제하므로 연결 실패 시 즉시 종료한다. 운영 환경을 위한 재시도 정책(예: exponential backoff)은 컨테이너 오케스트레이션 레이어 또는 추후 Phase에서 별도 다룬다.
- SC-002의 `/health` 응답 시간 기준(100ms)은 로컬 개발 환경 기준이다. 운영 SLA는 추후 Phase에서 별도 정의한다.

## Clarifications

### Session 2026-04-23

- Q: DB 연결 실패 시 재시도 정책이 필요한가? → A: Phase 1-1(로컬) 범위에서는 즉시 종료. 운영 환경 재시도 정책은 추후 Phase에서 별도 정의.
- Q: SC-002 `/health` 응답 시간 기준은 로컬 기준인가, 운영 기준인가? → A: 로컬 개발 환경 기준.
