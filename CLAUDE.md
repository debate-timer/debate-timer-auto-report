# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

Debate Timer 앱의 Amplitude 지표를 주기적으로 수집·분석하여 Discord 채널로 리포트를 자동 전송하는 NestJS 기반 서비스다. 현재는 **Phase 0 (설계 고정)** 완료 직후이며, Phase 1 (Walking Skeleton) 착수 단계다.

## 개발 명령어

```bash
# 개발 서버 실행 (Watch 모드)
npm run start:dev

# 빌드
npm run build

# 프로덕션 실행
npm run start:prod

# 린트 (자동 수정 포함)
npm run lint

# 포맷팅
npm run format

# 단위 테스트 전체
npm test

# 단일 테스트 파일 실행
npx jest src/path/to/file.spec.ts

# 테스트 Watch 모드
npm run test:watch

# 커버리지
npm run test:cov

# E2E 테스트
npm run test:e2e
```

## 기술 스택

| 레이어 | 선택 |
| --- | --- |
| Framework | NestJS (latest stable) |
| Language | TypeScript (strict mode) |
| ORM | Prisma (권장, 미확정) |
| Database | PostgreSQL (권장, 미확정) |
| 스케줄러 | `@nestjs/schedule` (내장 cron) |
| 로깅 | nestjs-pino + pino-http |
| AI 통합 | AI SDK Core (Phase 8에서 활성화) |
| AI 출력 스키마 | Zod |
| 지표 원천 | Amplitude (무료 플랜) |
| 에러 모니터링 | Sentry (Phase 9에서 활성화) |
| 전달 채널 | Discord Webhook |

## 아키텍처

### 계층 구조

```text
외부 수집 계층 (Amplitude → MetricSourceAdapter)
    ↓
내부 저장 계층 (Prisma / PostgreSQL 스냅샷 저장)
    ↓
분석 계층 (비교, 변화율 계산, 이상치 판별)
    ↓
리포트 계층 (주간/월간/경고 메시지 composer)
    ↓
AI 계층 (bounded tool calling, Phase 8, AI_ENABLED=false)
    ↓
전송 계층 (Discord Webhook + 재시도)
    ↓
운영 계층 (스케줄, 실행 이력, 멱등성, 관측성)
```

### 권장 모듈 구조 (`src/modules/`)

- `config/` — ConfigModule, 환경변수 스키마
- `health/` — `/health` 엔드포인트
- `scheduler/` — `@nestjs/schedule` cron 등록
- `runs/` — 실행 단위 추적, 상태 전이, 멱등성 키 생성
- `metric-definitions/` — 지표 정의 관리 (key, source, query_spec, 경고 규칙)
- `metric-sources/core/` + `metric-sources/amplitude/` — `MetricSourceAdapter` 인터페이스 및 Amplitude 구현
- `snapshots/` — `metric_snapshots` 저장
- `analysis/comparison/` + `analysis/alert-rules/` — 비교, 변화율, 이상치 판별
- `reports/composers/` + `reports/templates/` — Discord 전송용 payload 생성
- `delivery/discord/` — Webhook 전송 + 지수 백오프 재시도
- `observability/` — 마지막 성공 시각, 실행 성공률 집계
- `ai/` — bounded tool calling (Phase 8, 현재 placeholder)
- `error-sources/core/` + `error-sources/sentry/` — Phase 9 확장 위치
- `common/time/`, `common/ids/`, `common/logging/`, `common/masking/`, `common/errors/`

### 핵심 DB 테이블

- `metric_definitions` — 지표 정의 (key, source, query_spec, direction, min_sample_size, warning_rule)
- `metric_snapshots` — 기간별 수집값 스냅샷 (period_type, period_start, period_end, value, sample_size)
- `report_runs` — 실행 이력 (run_type, idempotency_key, status, trigger_type)
- `deliveries` — Discord 전송 이력 (status, attempt_count, sent_at, error_summary)
- `alerts` — 경고 발송 이력 (metric_key, severity, idempotency_key)

## 핵심 제약사항

### 타임존

- 모든 날짜·시간 계산은 **Asia/Seoul (UTC+9)** 기준
- 주간 경계: 월요일 00:00:00 ~ 일요일 23:59:59 KST
- 서버 시스템 타임존에 의존하지 말 것; 컨테이너 `TZ=Asia/Seoul` 설정 또는 `date-fns-tz`/`luxon` 사용

### 멱등성

- 리포트·경고마다 `(run_type + target_period_key + report_version)` 조합으로 멱등성 키 생성
- 스케줄·재시도·수동 재실행 모두 이 키로 중복 전송 방지
- 수동 재실행 기본 동작은 skip; `force=true` 플래그에만 재전송 허용

### Discord 메시지 한도

- 본문 2000자, Embed description 4096자, Embed 합계 6000자
- 초과 시 사전 절삭 또는 스레드/첨부 분리

### 지표 원천

- **GA4 연동 없음** (Amplitude-first 전략, ADR 001)
- Sentry는 Phase 9에서 추가
- AI는 Phase 8에서 활성화 (현재 `AI_ENABLED=false`, 템플릿 요약 대체)

### 이상치 판별 규칙

- 분모 10 미만 → `판별 불가`
- 분모 10 이상 30 미만 → `참고치`
- 분모 30 이상 → 비교/경고 대상
- 경고는 변화율 조건 **AND** 절대 건수 조건을 동시에 만족할 때만 생성

### 전송 실패 재시도

- 최대 3회, 지수 백오프 (5초 → 15초 → 45초)
- 최종 실패 시 OPS 채널로 별도 알림

## 환경변수

`.env.example` 참조. 주요 키:

- `DATABASE_URL` — PostgreSQL 연결 문자열
- `AMPLITUDE_API_KEY`, `AMPLITUDE_SECRET_KEY`
- `DISCORD_WEBHOOK_URL_TEST/REPORT/ALERT/OPS` — 채널별 분리
- `SCHEDULE_WEEKLY_REPORT`, `SCHEDULE_MONTHLY_REPORT` — cron 표현식 (KST 기준)
- `AI_ENABLED=false` — Phase 8 전까지 false 유지
- `LOG_LEVEL` — pino 로그 레벨

환경변수 파일은 리포지토리에 커밋 금지. 운영 서버에서는 컨테이너 외부 파일을 볼륨 마운트로 주입.

## 브랜치 및 이슈 규칙

### 브랜치 네이밍

```text
{type}/#{issue_number}
```

예시: `feat/#6`, `fix/#12`, `docs/#3`

타입 목록: `feat` · `fix` · `hotfix` · `refactor` · `docs` · `test` · `chore` · `ci`

### PR 제목

```text
[TYPE] 작업 제목
```

예시: `[FEAT] Amplitude Adapter 구현`, `[FIX] Discord 전송 재시도 오류 수정`

타입 대문자 매핑: `feat`→`FEAT` · `fix`→`FIX` · `hotfix`→`HOTFIX` · `refactor`→`REFACTOR` · `docs`→`DOCS` · `test`→`TEST` · `chore`→`CHORE` · `ci`→`CI`

### 이슈 연결

PR 본문 **관련 이슈** 섹션에 `closes #이슈번호` 를 기입하면 PR 머지 시 해당 이슈가 자동으로 닫힌다.

### 이슈 구조

- **메인 이슈**: Phase 단위 또는 대형 기능 단위로 생성
- **서브 이슈**: 메인 이슈 하위 작업 단위로 생성, 본문에 `상위 이슈: #{번호}` 명시
- 브랜치는 서브 이슈 기준으로 생성 (`feat/#{서브이슈번호}`)
- PR은 항상 서브 이슈 번호를 참조하고, 본문에 설계 판단 이유를 기록

### 머지 대상

- 일반 브랜치 → `develop`
- `hotfix` 브랜치 → `main` + `develop`

## 현재 구현 단계

Phase 0 완료, Phase 1 (Walking Skeleton) 착수 예정.

**Phase 1 목표**: `수동/스케줄 실행 → Amplitude 지표 1개 조회 → DB 저장 → Discord 테스트 채널 전송` (로컬 개발 환경 기준)

구현 우선순위 문서: `docs/implementation-plan.md` (13장 추천 개발 순서)
