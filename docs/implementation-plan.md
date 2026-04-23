# 지표 자동 리포팅 시스템 상세 구현 계획서

## 1. 문서 목적

본 문서는 [metrics-reporting-srs.md](./metrics-reporting-srs.md)와 [tech-stack.md](./tech-stack.md)를 기준으로, 실제 개발을 시작할 수 있는 수준의 상세 구현 계획을 정리한다.

현재 구현 전략은 다음과 같다.

- 1차 구현은 **Amplitude 기반 지표 분석 파이프라인**에 집중한다.
- 2차 구현에서 **Sentry 기반 에러 분석 파이프라인**을 추가한다.
- 단, 초기 구조부터 **Amplitude 전용 하드코딩**이 아니라 **추후 Sentry 및 다른 소스 확장**이 가능한 방식으로 설계한다.
- AI는 초기 핵심이 아니라, **결정론적 분석 파이프라인** 위에 얹는 보조 계층으로 도입한다.

---

## 2. 구현 목표 요약

### 2.1 1차 목표

Amplitude에서 핵심 지표를 주기적으로 조회하고, 내부 표준 포맷으로 저장한 뒤, 비교/판별/요약을 거쳐 Discord에 주간/월간 리포트를 전송한다.

### 2.2 2차 목표

Sentry 에러 데이터를 별도 수집·요약하고, 이후 리포트 생성 단계에서 지표와 에러를 함께 조합해 해석할 수 있도록 확장한다.

### 2.3 장기 목표

다음 조건을 만족하는 지속가능한 분석 시스템을 구축한다.

- 지표 추가가 쉬운 구조
- 데이터 원천 추가가 쉬운 구조
- 실패 원인 추적이 쉬운 구조
- AI 실패 시에도 리포트가 유지되는 구조
- 멱등성, 보안, 운영관측이 기본 내장된 구조

---

## 3. 범위 선언

### 3.1 1차 구현 범위

- NestJS 기반 애플리케이션 뼈대 구성
- PostgreSQL + Prisma 기반 저장소 구성
- Amplitude API 연동
- 지표 정의 관리
- 지표 스냅샷 저장
- 기간 비교 및 변화율 계산
- 규칙 기반 이상치 판별
- 주간/월간 리포트 생성
- Discord Webhook 전송
- 실행 이력 및 전송 이력 저장
- 멱등성 기반 중복 전송 방지
- 운영 로그 및 기본 관측성
- 수동 실행 API
- 스케줄 실행
- AI 요약 계층의 최소 도입 또는 placeholder 구조 확보

### 3.2 2차 구현 범위

- Sentry API 연동
- 에러 그룹 스냅샷 저장
- 민감정보 마스킹 파이프라인
- 에러 증가 탐지 및 위치 요약
- 지표 + 에러 결합 리포트
- AI 입력 확장

### 3.3 1차 범위에서 제외

- GA4 연동
- 관리자 UI
- 다중 채널 전송
- 자율형 agent
- 고급 세그먼트 분석
- 에러-지표 상관관계 자동 추론 고도화

---

## 4. 핵심 아키텍처 원칙

### 4.1 계층 분리

다음 계층을 분리한다.

- 외부 수집 계층: Amplitude, 이후 Sentry
- 내부 저장 계층: 스냅샷, 실행 이력, 전송 이력
- 분석 계층: 비교, 변화율 계산, 이상치 판별
- 리포트 계층: 주간/월간/경고 메시지 조합
- 전송 계층: Discord
- 운영 계층: 스케줄, 실행 상태, 비용/실패 추적
- AI 계층: 요약/가설/액션 생성

이 분리는 추후 Sentry를 붙일 때 기존 Amplitude 로직을 건드리지 않고 확장하기 위한 전제다.

### 4.2 Source Adapter 분리

Amplitude와 Sentry는 같은 “외부 의존성”이지만 동일한 데이터가 아니다.

- Amplitude는 `MetricSourceAdapter`
- Sentry는 `ErrorSourceAdapter`

로 분리한다.

즉, 처음부터 둘을 하나의 과도한 공통 추상화로 묶지 않는다. 대신 리포트 생성 단계에서 결합한다.

### 4.3 설정 기반 확장

다음 항목은 코드 하드코딩을 최소화하고 설정 기반으로 관리한다.

- 활성 지표 목록
- 지표 식별 키
- 지표 원천
- 지표 조회 명세
- 단위
- 좋은 방향
- 최소 표본 수
- 경고 임계치
- 리포트 대상 지표 목록
- 스케줄 시각

### 4.4 결정론적 파이프라인 우선

리포트 품질의 기준은 먼저 애플리케이션이 만든 구조화 데이터다.

순서는 다음과 같다.

1. 외부 원천 조회
2. 내부 표준 포맷 변환
3. 저장
4. 비교/계산/판별
5. 템플릿 기반 리포트 생성
6. 필요 시 AI 요약 추가

AI는 이 체인의 마지막에 위치해야 하며, 실패 시 5단계 결과만으로도 운영이 가능해야 한다.

### 4.5 운영 기능을 코어로 취급

이 시스템은 자동화 시스템이므로 다음 기능은 “부가기능”이 아니라 코어다.

- 멱등성
- 실행 이력 저장
- 실패 사유 기록
- 마지막 성공 시각 저장
- 재시도
- 타임존 일관성

### 4.6 Walking Skeleton 우선

기존 계획은 구조 분해 측면에서는 타당하지만, 실제 개발 순서로는 다소 무겁다.

본 프로젝트의 실행 전략은 **Walking Skeleton 우선**으로 조정한다.

핵심 원칙은 다음과 같다.

1. 가장 먼저 **끝까지 한 번 도는 얇은 파이프라인**을 만든다.
2. 처음에는 지표 1개, 채널 1개, 기간 1개만 지원해도 된다.
3. 이후에 비교 로직, 이상치 판별, 멱등성, 관측성, AI, Sentry를 순차적으로 덧붙인다.

초기 Walking Skeleton의 목표는 다음 한 줄로 정의한다.

- **수동 또는 스케줄 실행 -> Amplitude 지표 1개 조회 -> DB 저장 -> Discord 테스트 채널 전송**

이 전략을 채택하는 이유는 다음과 같다.

- 기능 전체 흐름의 병목을 가장 빨리 찾을 수 있다.
- Amplitude API, DB 스키마, Discord payload, 실행 이력 구조를 초기에 함께 검증할 수 있다.
- 이후 단계에서 추가하는 기능이 모두 같은 실행 경로 위에 쌓이므로 회귀를 잡기 쉽다.
- 지금 요구사항인 `Amplitude 먼저, Sentry 후속`과도 가장 잘 맞는다.

---

## 5. 권장 모듈 구조

```text
src/
  app.module.ts
  main.ts
  modules/
    config/
    health/
    scheduler/
    runs/
    observability/
    metric-definitions/
    metric-sources/
      core/
      amplitude/
    snapshots/
    analysis/
      comparison/
      alert-rules/
    reports/
      composers/
      templates/
    delivery/
      discord/
    ai/
    error-sources/
      core/
      sentry/
  common/
    time/
    ids/
    logging/
    masking/
    errors/
```

### 구조 해설

- `metric-definitions`: 어떤 지표를 수집하고 어떻게 판별할지 관리
- `metric-sources/amplitude`: Amplitude API 호출 및 응답 변환
- `snapshots`: 표준화된 지표 스냅샷 저장
- `analysis`: 비교, 변화율, 표본 조건, 이상 판별
- `reports`: 사람이 읽을 수 있는 리포트 payload 생성
- `delivery/discord`: Discord Webhook 전송 및 재시도
- `runs`: 실행 단위 추적, 상태 변경, 멱등성
- `observability`: 마지막 성공 시각, 최근 실행 성공률, 외부 호출 통계
- `error-sources/sentry`: 후속 단계 확장 위치

---

## 6. 초기 데이터 모델 제안

### 6.1 핵심 테이블

#### `metric_definitions`

- `id`
- `key`
- `name`
- `source`
- `query_spec`
- `unit`
- `direction`
- `min_sample_size`
- `warning_rule`
- `enabled`
- `created_at`
- `updated_at`

#### `metric_snapshots`

- `id`
- `metric_definition_id`
- `source`
- `period_type`
- `period_start`
- `period_end`
- `segment_key`
- `segment_value`
- `value`
- `sample_size`
- `raw_ref`
- `collected_at`

#### `report_runs`

- `id`
- `run_type`
- `target_period_key`
- `status`
- `started_at`
- `finished_at`
- `trigger_type`
- `error_summary`
- `report_version`
- `idempotency_key`

#### `deliveries`

- `id`
- `run_id`
- `channel_type`
- `channel_target`
- `status`
- `attempt_count`
- `sent_at`
- `response_ref`
- `error_summary`

#### `alerts`

- `id`
- `metric_key`
- `source`
- `period_key`
- `severity`
- `reason_code`
- `idempotency_key`
- `created_at`

### 6.2 2차 확장 테이블

#### `error_group_snapshots`

- `id`
- `source`
- `group_key`
- `title`
- `level`
- `count`
- `affected_users`
- `release`
- `top_location`
- `top_api`
- `top_flow`
- `first_seen_at`
- `last_seen_at`
- `period_start`
- `period_end`
- `collected_at`

#### `ai_usage_logs`

- `id`
- `run_id`
- `prompt_version_id`
- `provider`
- `model`
- `tool_call_count`
- `input_tokens`
- `output_tokens`
- `estimated_cost`
- `status`
- `created_at`

#### `ai_tool_calls`

- `id`
- `run_id`
- `tool_name`
- `step_index`
- `arguments_json`
- `result_summary`
- `latency_ms`
- `status`
- `created_at`

#### `prompt_versions`

- `id`
- `prompt_type`
- `version`
- `template`
- `is_active`
- `created_at`

#### `report_evaluations`

- `id`
- `run_id`
- `prompt_version_id`
- `evaluator_type`
- `score`
- `hallucination_check_passed`
- `notes`
- `created_at`

---

## 7. 구현 단계 상세

### 7.1 Phase 0. 설계 고정

#### 목표

개발 도중 흔들리기 쉬운 결정사항을 먼저 고정한다.

#### 작업 항목

- Node.js / TypeScript / NestJS / Prisma / PostgreSQL 확정
- 기본 타임존 정책 확정: `Asia/Seoul`
- 주간 경계, 월간 경계 계산 규칙 고정
- 1차 범위를 `Amplitude only`로 확정
- 수동 실행 API 우선 전략 확정
- Discord 테스트 채널과 운영 채널 분리 전략 확정
- 환경변수 파일 구조 확정
- 현재 단계의 목표를 `로컬에서 동작 가능`으로 한정
- 배포 인프라는 `개발용`과 `운영용`으로 분리해 후속 단계에서 적용

#### 산출물

- 본 문서
- ADR 1건
- `.env.example`
- 환경변수 키 목록

#### 완료 기준

- 팀이 “1차에서는 Sentry를 직접 구현하지 않는다”는 점에 합의
- 필수 환경변수 목록이 확정

### 7.2 Phase 1. Walking Skeleton

#### 목표

가장 얇은 end-to-end 파이프라인을 먼저 완성한다.
이 단계의 실행 기준은 **로컬 개발 환경**이다.

#### 작업 항목

- NestJS 프로젝트 초기화
- ConfigModule 적용
- Prisma 초기화 및 DB 연결
- Pino 로깅 적용
- `/health` 엔드포인트 추가
- 최소 스키마 생성
- `metric_definitions`
- `metric_snapshots`
- `report_runs`
- `deliveries`
- 핵심 지표 1개 seed 등록
- `MetricSourceAdapter` 인터페이스 최소 정의
- `AmplitudeMetricSourceAdapter` 1개 지표 조회 구현
- 수동 실행 API 또는 내부 실행 entrypoint 구현
- 단순 리포트 payload 생성
- Discord Webhook 테스트 전송 구현
- 기본 실행 단위(`run`) 생성 및 상태 저장
- 동일 실행 경로를 사용하는 cron 1개 등록

#### 산출물

- 1개 지표 기준 end-to-end 실행 경로
- 테스트 Discord 채널 전송 결과
- 최소 실행 이력 저장 결과

#### 완료 기준

- 로컬에서 앱 기동 가능
- DB migration 1회 수행 가능
- `/health` 응답 성공
- 수동 실행으로 지표 1개 조회 -> 저장 -> Discord 전송 가능
- cron이 같은 use case를 호출해 실행 가능
- Oracle, nginx, HTTPS 없이도 로컬 기준으로 전 흐름 검증 가능

### 7.3 Phase 2. Skeleton 안정화

#### 목표

Walking Skeleton을 실제 운영 가능한 최소 수준으로 단단하게 만든다.
또한 이후 개발용 배포 인프라를 붙여도 문제를 추적할 수 있는 상태를 만든다.

#### 작업 항목

- `idempotency_key` 생성 및 중복 전송 방지
- Discord 전송 재시도 및 지수 백오프
- 실행 성공/실패 상태 전이 정리
- 마지막 성공 시각 저장
- 최소 운영 로그 구조 정리
- 수동 재실행 시 `force` 정책 반영
- 중복 실행 잠금 전략 정의

#### 산출물

- 중복 전송 방지 동작
- 재시도 및 실패 이력 저장
- 기본 운영 상태 추적 기반

#### 완료 기준

- 같은 리포트가 중복 전송되지 않음
- Discord 실패 시 최대 3회 재시도
- 운영자가 직전 실행 성공/실패를 추적 가능
- 이 시점부터 개발용 배포 인프라(dev/staging) 적용을 검토할 수 있음

### 7.4 Phase 3. 지표 정의 확장 및 저장 모델

#### 목표

Walking Skeleton을 3~5개 핵심 지표로 확장할 수 있는 기반을 만든다.

#### 작업 항목

- 지표 정의 확장
- 지표 조회 명세(`query_spec`) 포맷 정의
- `period_type`, `period_key` 표준 정의
- 지표 단위, 좋은 방향, 최소 표본, 경고 규칙 구조 추가
- 초기 핵심 지표 3~5개 등록

#### 산출물

- 확장 가능한 지표 정의 저장 구조
- 다중 지표 초기 세트

#### 완료 기준

- 최소 3~5개 핵심 지표 정의 저장 가능
- 기간 단위 기준으로 스냅샷 저장 모델 확정

### 7.5 Phase 4. Amplitude 수집 계층 확장

#### 목표

Amplitude 지표를 여러 metric definition 기준으로 읽어서 내부 표준 포맷으로 변환한다.

#### 작업 항목

- 기간 조건 기반 조회 함수 구현
- 응답 변환기 구현
- API 실패 처리 및 로깅
- 원본 응답 참조값 저장 전략 정의
- API 호출 수를 예측 가능하게 제한하는 배치 전략 설계

#### 산출물

- Amplitude 조회 서비스
- 내부 표준 스냅샷 변환 로직

#### 완료 기준

- 특정 주간/월간 기간으로 지표 조회 가능
- 조회 결과를 `metric_snapshots`에 저장 가능
- 실패 시 특정 지표만 실패 처리하고 전체 실행은 유지

### 7.6 Phase 5. 비교 및 이상치 판별

#### 목표

숫자 기반 리포트 핵심 로직을 완성한다.

#### 작업 항목

- 현재 기간 vs 이전 기간 비교 로직 구현
- 변화량 계산
- 변화율 계산
- 이전 값 0 또는 누락 시 안전 처리
- `신규 수집`, `판별 불가` 상태 모델링
- 최소 표본 조건 구현
- 변화율 + 절대 변화량 동시 조건 구현
- 심각도 판별 로직 구현

#### 산출물

- 분석 결과 DTO
- 경고 후보 판별 결과

#### 완료 기준

- 모든 지표에 대해 비교 결과 생성 가능
- 표본 부족/이전 데이터 부재/정상/경고 상태를 일관되게 구분 가능

### 7.7 Phase 6. 리포트 생성

#### 목표

분석 결과를 사람이 읽을 수 있는 구조로 바꾼다.

#### 작업 항목

- 주간 리포트 composer 구현
- 월간 리포트 composer 구현
- 경고 메시지 composer 구현
- Discord 한도 고려한 절삭 정책 구현
- 템플릿 기반 기본 문구 작성
- 재전송 표시 규칙 반영

#### 산출물

- 리포트 payload 생성기
- Discord 전송용 구조체

#### 완료 기준

- AI 없이도 주간/월간/경고 메시지 생성 가능
- Discord 길이 제한 내에서 payload 생성 가능

### 7.8 Phase 7. 운영 관측성

#### 목표

시스템 상태를 추적 가능하게 만든다.

#### 작업 항목

- 리포트 유형별 마지막 성공 시각 저장
- 최근 실행 성공/실패 집계
- 외부 호출 실패율 집계
- 운영용 상태 조회 API 또는 로그 요약 추가
- 시스템 운영 경고 채널 분리 여지 확보

#### 산출물

- 최소 운영 대시보드 역할의 조회 기능
- 장애 원인 추적 기반

#### 완료 기준

- 최근 실행 상태와 마지막 성공 시각 확인 가능
- 외부 연동 실패가 어떤 계층에서 났는지 추적 가능

### 7.9 Phase 8. AI 요약 계층

#### 목표

결정론적 분석 결과 위에 **bounded analyzer agent**를 안전하게 얹는다.
이 단계의 목표는 단순 요약 호출이 아니라, 제한된 읽기 전용 도구를 조건부로 호출할 수 있는 AI 분석 루프를 만드는 것이다.

#### 작업 항목

- AI provider abstraction 정의
- 구조화된 입력 payload 생성
- 응답 스키마 정의
- `prompt_versions` 기반 prompt versioning 도입
- 활성 prompt 버전 조회 및 `ai_usage_logs.prompt_version_id` 기록
- 읽기 전용 tool inventory 정의
- 예: `get_metric_summary`, `get_top_changes`, `get_segment_breakdown`, `get_report_context`
- tool calling 루프 구현
- AI는 필요할 때만 도구를 호출하고, 기본적으로 0회 호출도 허용
- 도구 호출 상한은 기본 `3회`로 제한
- tool 호출 결과를 `ai_tool_calls`에 기록
- 스키마 위반 시 재시도 또는 fallback
- 토큰/비용 상한 적용
- 템플릿 fallback 최종 연동
- AI 사용량 로그 저장
- 숫자 일치 검증 규칙 구현
- 예: 요약에 등장한 핵심 수치가 원본 계산 결과와 일치하는지 검사
- 골든셋 기반 초기 eval 세트 작성
- 최소 10건의 대표 리포트 입력/기대 출력 케이스 확보
- LLM-as-judge 평가 1종 구현
- 규칙 기반 평가 1종 구현
- `report_evaluations` 저장 및 회귀 확인 절차 정의

#### 산출물

- bounded AI 분석 서비스
- prompt versioning 구조
- 기본 eval 파이프라인
- 템플릿 fallback 연계

#### 완료 기준

- AI 실패가 리포트 실패로 이어지지 않음
- AI 사용량이 실행 이력과 함께 기록됨
- AI가 제한된 read-only tools를 조건부로 호출 가능
- 호출 수, prompt 버전, 평가 결과를 추적 가능
- 최소 1개의 규칙 기반 평가와 1개의 LLM 기반 평가가 동작

### 7.10 Phase 9. Sentry 확장

#### 목표

기존 구조를 유지한 채 에러 분석 기능을 추가한다.

#### 작업 항목

- `ErrorSourceAdapter` 인터페이스 정의
- `SentryErrorSourceAdapter` 구현
- `error_group_snapshots` 저장
- 민감정보 마스킹 계층 구현
- 신규 에러 / 급증 에러 판별 로직 구현
- 위치 정보 요약 로직 구현
- 리포트 composer에 에러 섹션 추가
- 지표/에러 결합 규칙 정의

#### 산출물

- 에러 수집 및 요약 파이프라인
- Sentry 포함 리포트

#### 완료 기준

- 특정 기간 기준 Sentry 에러 그룹 요약 가능
- 마스킹 후 Discord/AI 입력에 사용 가능
- 지표 중심 리포트에 에러 섹션 추가 가능

---

## 8. Phase별 선행관계

```text
Phase 0
  -> Phase 1
  -> Phase 2
  -> Phase 3
  -> Phase 4
  -> Phase 5
  -> Phase 6
  -> Phase 7
  -> Phase 8
  -> Phase 9
```

실제 병렬화 가능한 구간은 다음과 같다.

- Phase 1 진행 중 최소 스키마 설계와 Discord payload 초안 병렬 진행 가능
- Phase 2 완료 직후 Phase 3, Phase 4 일부 병렬 진행 가능
- Phase 5 완료 직후 Phase 6, Phase 7 일부 병렬 진행 가능
- Phase 8은 1차 릴리스 이후 별도 트랙으로 진행 가능
- Phase 9는 Sentry 준비가 되기 전까지 보류 가능

---

## 8.1 주차별 실행 계획

### Week 1. Walking Skeleton

목표:

- **수동 또는 스케줄 실행 -> 지표 1개 조회 -> 저장 -> Discord 테스트 채널 전송**
- **로컬 개발 환경에서 동작하면 충분하며, 배포 인프라는 아직 범위에 넣지 않는다**

작업:

- NestJS 초기화
- Prisma/PostgreSQL 연결
- 최소 실행 이력 스키마
- Amplitude 지표 1개 조회
- 간단한 저장 로직
- Discord 테스트 전송
- 같은 use case를 호출하는 cron 1개 등록

### Week 2. Core 로직 + MVP 안전장치

작업:

- 지표 정의 3~5개 확장
- 전주 비교 + 변화율 계산
- `신규 수집`, `판별 불가` 처리
- 규칙 기반 이상치 판별
- 멱등성 키 기반 중복 방지
- Discord 재시도 및 실패 이력 저장
- 마지막 성공 시각 및 기본 운영 로그

### Week 3. 리포트 품질 + AI

작업:

- 주간/월간 리포트 composer 고도화
- 경고 메시지 구조화
- Discord 길이 제한 대응
- AI 요약 연동
- bounded tool loop 연동
- prompt versioning 도입
- 템플릿 fallback
- AI 사용량 로그 저장
- 골든셋 + 기본 eval 연동

### Week 4. Sentry 확장

작업:

- Sentry 조회
- 민감정보 마스킹 파이프라인
- 에러 그룹 스냅샷 저장
- 신규/급증 에러 판별
- 지표 + 에러 결합 리포트

이 주차별 계획은 일정 예시이며, 실제 기준은 `각 주가 아니라 각 Phase의 완료 기준`이다.

---

## 8.2 인프라 적용 시점

배포 인프라는 현재 최우선이 아니다. 현 시점의 목표는 `로컬에서 안정적으로 동작하는 Walking Skeleton`이다.

인프라는 다음처럼 세 단계로 나눠 적용한다.

### Local 개발 인프라

적용 시점:

- Phase 1부터 즉시

범위:

- 로컬 NestJS 실행
- 로컬 또는 컨테이너 기반 PostgreSQL
- `.env` 기반 비밀값 주입
- Discord 테스트 채널 연동

목표:

- 앱 기능 자체를 가장 빠르게 검증

### 개발용 배포 인프라

적용 시점:

- **Phase 2 완료 직후**가 적절

선행 조건:

- Walking Skeleton end-to-end 동작 완료
- 멱등성 동작 확인
- 재시도 및 실행 이력 확인 가능

범위:

- Oracle Cloud 또는 기타 상시 실행 환경
- Docker / Docker Compose
- SSH 및 기본 방화벽
- dev 환경변수 주입

목표:

- 서버 환경에서도 주기 실행과 장애 추적이 가능한지 검증

### 운영용 배포 인프라

적용 시점:

- **Phase 6~7 이후**가 적절

선행 조건:

- 핵심 지표 3~5개 수집 안정화
- 비교/이상치 판별 동작
- 리포트 포맷 안정화
- 기본 운영 관측성 확보

범위:

- 운영 서버
- nginx
- HTTPS
- 운영용 env / secrets 관리
- 운영 채널 및 운영 알림 채널 분리

목표:

- 실제 운영 자동화 환경으로 전환

정리하면, 지금 단계에서는 `로컬만`, 그 다음은 `개발용 배포`, 마지막이 `운영용 배포`다.

---

## 9. 초기 핵심 지표 정의 가이드

초기에는 3~5개 지표만 선정한다. 너무 많은 지표를 한 번에 넣으면 Amplitude 쿼리, 리포트 품질, 임계치 설정이 모두 불안정해진다.

추천 기준은 다음과 같다.

- 제품 핵심 가치를 대표하는 지표
- 이벤트 정의가 비교적 명확한 지표
- 주간 단위 변화가 운영 액션으로 연결되는 지표
- 샘플 수가 너무 작지 않은 지표

예시 후보는 다음과 같다.

- 주간 활성 사용자 수
- 핵심 기능 실행 수
- 회원가입 완료 수
- 주요 전환 이벤트 완료 수
- 리텐션 보조 지표 1개

초기에는 세그먼트 없이 전체값부터 안정화하고, 이후 플랫폼/유입경로 분해를 추가한다.

---

## 9.1 MVP 핵심 지표 목록

MVP에서는 대시보드 전체를 모두 자동 분석 대상으로 삼지 않는다. 저표본 환경에서도 해석 가능성과 제품 설명력이 높은 지표만 우선 포함한다.

우선순위는 다음과 같다.

### 1순위. `timer_started`

의미:

- 실제 제품 사용이 시작된 횟수 또는 사용자 수

이유:

- Debate Timer의 핵심 기능 진입량을 가장 직접적으로 보여준다.
- 모든 후속 퍼널의 분모 역할을 하므로 반드시 필요하다.

리포트 활용:

- 주간/월간 사용 시작량 추이
- 이전 기간 대비 증감

### 2순위. `timer_started -> debate_completed`

의미:

- 토론 시작 후 완주까지 이어진 비율

이유:

- 서비스가 핵심 가치를 전달했는지 보여주는 대표 지표다.
- 포트폴리오 관점에서도 가장 설명력이 높다.

리포트 활용:

- 완주 전환율
- 이전 기간 대비 변화
- member / guest 세그먼트 비교는 데이터가 충분할 때만 보조로 사용

### 3순위. `debate_abandoned`

의미:

- 토론 중 이탈한 비율과 이탈 유형

이유:

- 완주율보다 더 직접적인 UX 개선 힌트를 준다.
- 이미 이벤트가 심어져 있으므로 추가 비용 없이 활용할 수 있다.

리포트 활용:

- 이탈률 추이
- `abandon_type` 분포
- navigation / unload / visibility 중 어떤 이탈이 많은지 요약

### 4순위. `template_selected -> template_used`

의미:

- 템플릿 선택 후 실제 사용으로 이어진 비율

이유:

- 랜딩 -> 템플릿 -> 실제 사용까지의 진입 장벽을 보여준다.
- 사용 시작 전 단계의 마찰을 설명하기 좋다.

리포트 활용:

- 템플릿 사용 전환율
- 이전 기간 대비 변화
- 필요 시 상위 템플릿만 제한적으로 세그먼트 분석

### 5순위. `table_shared` / `share_link_entered`

의미:

- 사용 후 외부 공유와 공유 링크 유입

이유:

- 단순 사용량이 아니라 확산 가능성을 보여주는 성장 보조 지표다.
- 포트폴리오에서 “사용 이후 행동”을 설명하는 데 유용하다.

리포트 활용:

- 공유 횟수 추이
- 공유 링크 진입 추이
- 필요 시 member / guest 비교

## 9.2 조건부 2순위 지표

다음 지표는 가치가 있지만, 저표본 또는 제품 우선순위를 고려해 MVP 기본셋에서는 제외하거나 보조 지표로 사용한다.

### `login_started -> login_completed`

- 로그인 UX 자체를 개선하려는 시점에는 우선순위를 올릴 수 있다.
- 현재는 guest 사용도 가능한 제품 구조라면 핵심 사용 퍼널보다 한 단계 뒤에 둔다.

### `member / guest 활성 사용자 비율`

- 사용자 구조 변화를 보는 보조 지표로는 유효하다.
- 다만 핵심 제품 성과를 직접 설명하는 지표는 아니므로 메인 KPI로 두지는 않는다.

## 9.3 MVP 보류 지표

다음 지표는 데이터가 더 쌓이기 전까지 자동 리포트 핵심 분석 대상에서 제외한다.

### `page_leave.duration_ms`

- 평균 체류 시간은 저표본에서 흔들림이 크고 이상값 영향이 크다.
- 참고용 탐색 지표로만 활용한다.

### `debate_completed -> feedback_timer_started`

- 기능 가치 자체는 있으나 이벤트 수가 적으면 해석이 매우 불안정하다.
- 데이터 축적 후 2차 리포트 대상에 넣는다.

### `poll_created -> poll_result_viewed`

- 사용자 풀이 작으면 퍼널 분모가 너무 작아질 가능성이 높다.
- 2차 확장 또는 참고 리포트 대상이 적절하다.

## 9.4 저표본 해석 규칙

이 프로젝트는 사용자 수가 많지 않은 환경을 전제로 한다. 따라서 변화율만으로 강한 해석을 하지 않는다.

기본 규칙은 다음과 같다.

- 분모가 `10 미만`이면 `판별 불가`
- 분모가 `10 이상 30 미만`이면 `참고치`
- 분모가 `30 이상`이면 비교/경고 대상
- 변화율 경고는 `변화율 조건`과 `절대 건수 조건`을 함께 만족할 때만 생성
- 리포트 본문에는 가능하면 `퍼센트`와 함께 `절대 건수`를 함께 표시
- 해석 문구는 원인 단정이 아니라 `가능한 가설` 수준으로 제한

## 9.5 MVP 기본 리포트 구성

주간/월간 리포트의 기본 구성은 다음 순서를 권장한다.

1. 사용 시작량: `timer_started`
2. 핵심 완주율: `timer_started -> debate_completed`
3. 이탈 분석: `debate_abandoned`
4. 진입 마찰 분석: `template_selected -> template_used`
5. 확산 보조 지표: `table_shared`, `share_link_entered`

이 구성이 좋은 이유는 `유입/선택 -> 사용 시작 -> 완주/이탈 -> 공유` 흐름이 한 번에 설명되기 때문이다.

---

## 9.6 AI 분석 도구 초기 목록

AI 계층은 원천 시스템을 직접 탐색하지 않는다. 애플리케이션이 제공하는 제한된 읽기 전용 도구만 사용한다.

초기 도구 목록은 다음을 권장한다.

### `get_metric_summary`

- 특정 지표의 현재 값, 이전 값, 변화율, 표본 수를 반환

### `get_top_changes`

- 이번 리포트에서 가장 크게 변한 지표 상위 N개를 반환

### `get_segment_breakdown`

- 특정 지표의 세그먼트별 분해값을 반환
- 초기에는 전체값만 우선 구현하고, 세그먼트는 선택적으로 연다

### `get_report_context`

- 리포트 대상 기간, 이전 기간, 임계치, 판정 상태 등 메타데이터를 반환

### `get_error_summary`

- Sentry 확장 이후 활성화
- 에러 그룹 요약, 증가 여부, 주요 위치를 반환

도구 사용 규칙은 다음과 같다.

- 기본 전략은 `앱이 먼저 계산 -> AI가 필요 시 추가 조회`
- 모든 도구는 read-only
- 기본 호출 상한은 `3회`
- 도구 호출 실패 시 재시도보다 fallback을 우선
- 도구 호출 여부와 결과 요약은 실행 로그에 남긴다

---

## 9.7 AI 품질 운영 원칙

AI 계층은 “잘 말하는 것”보다 “틀리지 않는 것”이 우선이다.

초기 운영 원칙은 다음과 같다.

- prompt는 `prompt_versions`로 버전 관리
- AI 출력은 반드시 스키마 검증
- 숫자 일치 여부를 규칙 기반으로 검사
- 대표 입력셋에 대한 정기 평가를 수행
- 품질 회귀가 발생하면 이전 prompt 버전으로 롤백 가능해야 함
- AI 실패 또는 평가 실패 시 템플릿 리포트로 대체 가능해야 함

이 원칙이 있어야 본 프로젝트를 단순 LLM 요약이 아니라 운영 가능한 AI 분석 시스템으로 설명할 수 있다.

---

## 10. 테스트 전략

### 10.1 유닛 테스트 우선 대상

- 기간 계산
- 변화율 계산
- 최소 표본 판정
- 변화율 + 절대값 동시 조건
- 심각도 판별
- 멱등성 키 생성
- Discord payload 절삭

### 10.2 통합 테스트 대상

- Amplitude 응답 -> 내부 스냅샷 변환
- 수동 실행 API -> run 생성 -> 저장 -> payload 생성
- Discord 전송 실패 -> 재시도 -> 최종 상태 저장
- AI tool loop -> tool 호출 기록 -> structured output 생성
- prompt version 변경 -> 실행 로그에 반영

### 10.3 2차 테스트 대상

- Sentry 마스킹 규칙
- 에러 그룹 증가 판별
- 지표 + 에러 결합 리포트

### 10.4 AI 평가 테스트 대상

- 골든셋 리포트 입력에 대한 구조화 출력 안정성
- 숫자 일치 규칙 검사
- 평가 점수 회귀 여부

---

## 11. 운영 준비 체크리스트

- `.env.dev`, `.env.prod` 분리
- Discord 테스트 채널 분리
- Amplitude dev / prod 프로젝트 키 분리
- DB migration 배포 절차 정리
- cron 실행 시각 검증
- 운영자 수동 실행 경로 점검
- 실패 알림 채널 분리 여부 결정
- 개발용 배포 인프라 적용 시점은 Phase 2 완료 이후로 유지
- 운영용 배포 인프라 적용 시점은 Phase 6~7 이후로 유지

---

## 12. 주요 리스크와 대응

### 12.1 Amplitude 쿼리 설계 불안정

위험:

- 이벤트 정의가 자주 바뀌면 지표 신뢰도가 무너질 수 있다.

대응:

- 지표 정의마다 `query_spec` 버전 관리
- 지표 정의 변경 시 `effective_from` 개념 도입 검토

### 12.2 작은 표본에서 과도한 경고 발생

위험:

- 변화율만 보면 의미 없는 경고가 많이 발생한다.

대응:

- 최소 표본 조건
- 절대 변화량 동시 조건
- 초기에는 경고를 보수적으로 설정

### 12.3 AI 품질 변동

위험:

- 요약 품질이 일정하지 않을 수 있다.

대응:

- 템플릿 기반 기본 리포트 유지
- AI는 추가 설명과 제한된 보조 조회만 담당
- 응답 스키마 강제
- prompt versioning
- 규칙 기반 + LLM 기반 eval 병행

### 12.4 추후 Sentry 통합 시 결합도 증가

위험:

- 초기 Amplitude 중심 코드가 너무 강하게 묶이면 Sentry 확장이 어려워진다.

대응:

- 수집 계층과 리포트 계층 분리
- 지표와 에러를 다른 모델로 유지
- composer 단계에서만 결합

---

## 13. 추천 개발 순서

실제 개발 착수 순서는 아래가 가장 안정적이다.

1. Walking Skeleton: NestJS + Prisma + Amplitude 1개 지표 + 저장 + Discord 전송
2. 같은 실행 경로에 cron 연결
3. 멱등성 + 재시도 + 기본 실행 이력
4. 지표 정의 확장 3~5개
5. 비교/판별 로직
6. 주간/월간/경고 리포트 composer
7. 운영 관측성
8. AI 요약
9. Sentry 확장

이 순서를 따르는 이유는 다음과 같다.

- 먼저 end-to-end 경로를 만든다.
- 그 다음 운영 안전장치를 넣는다.
- 그 다음 지표 해석 품질을 높인다.
- 마지막에 AI와 Sentry처럼 변동성이 큰 영역을 붙인다.

---

## 14. 1차 구현 완료 기준

다음 조건을 만족하면 1차 구현을 완료한 것으로 본다.

- Walking Skeleton 경로가 수동/스케줄 양쪽에서 동작함
- Amplitude 핵심 지표 3~5개를 주간/월간 기준으로 조회 가능
- 지표 스냅샷이 DB에 저장됨
- 전기간 대비 비교 결과가 생성됨
- 이상치 판별이 동작함
- Discord 테스트 채널로 리포트 전송 가능
- 멱등성 키 기반 중복 방지가 동작함
- 수동 실행과 스케줄 실행이 모두 가능함
- 마지막 성공 시각과 최근 실행 상태를 확인 가능함
- AI를 사용하지 않아도 리포트 운영 가능함

---

## 15. 다음 액션

문서 작성 이후 바로 착수할 작업은 아래 순서가 적절하다.

1. `ADR: Amplitude-first architecture` 작성
2. NestJS 프로젝트 초기화
3. Walking Skeleton에 필요한 최소 Prisma schema 초안 작성
4. 지표 1개 기준 `AmplitudeMetricSourceAdapter` 구현
5. 수동 실행 -> 저장 -> Discord 전송 경로 완성
