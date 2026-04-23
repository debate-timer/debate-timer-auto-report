# Current Phase Checklist

현재 활성 Phase: `Phase 1. Walking Skeleton`

> Phase 0 완료 (2026-04-23): ADR 001 작성, SRS 11.1 수정, `.env.example` 작성, 모든 완료 기준 충족.

## 목표

가장 얇은 end-to-end 파이프라인을 먼저 완성한다.

**이 단계의 실행 기준은 로컬 개발 환경이다.**

> 핵심 한 줄: 수동 또는 스케줄 실행 → Amplitude 지표 1개 조회 → DB 저장 → Discord 테스트 채널 전송

## Phase 1 체크리스트

### 프로젝트 초기화

- [ ] Nest CLI로 NestJS 프로젝트 초기화 (`--skip-install`, `--skip-git`, `--strict`)
- [ ] `ConfigModule` 적용 (`.env` 기반 환경변수 로드)
- [ ] Pino 로깅 적용
- [ ] `/health` 엔드포인트 추가

### DB 및 스키마

- [ ] Prisma 초기화 및 PostgreSQL 연결
- [ ] 최소 스키마 생성 및 migration 1회 수행
  - `metric_definitions`
  - `metric_snapshots`
  - `report_runs`
  - `deliveries`
- [ ] 핵심 지표 1개 seed 등록 (`timer_started`)

### 수집 계층

- [ ] `MetricSourceAdapter` 인터페이스 최소 정의
- [ ] `AmplitudeMetricSourceAdapter` 구현 (지표 1개 조회)

### 실행 파이프라인

- [ ] 수동 실행 API 또는 내부 실행 entrypoint 구현
- [ ] 기본 실행 단위(`run`) 생성 및 상태 저장
- [ ] 단순 리포트 payload 생성
- [ ] Discord Webhook 테스트 채널 전송 구현
- [ ] 동일 실행 경로를 호출하는 cron 1개 등록

## Phase 1 완료 기준

- [ ] 로컬에서 앱 기동 가능
- [ ] DB migration 1회 수행 가능
- [ ] `/health` 응답 성공
- [ ] 수동 실행으로 지표 1개 조회 → 저장 → Discord 전송 가능
- [ ] cron이 같은 use case를 호출해 실행 가능
- [ ] Oracle, nginx, HTTPS 없이도 로컬 기준으로 전 흐름 검증 가능

## 부트스트랩 규칙

- 임시 폴더에서 Nest CLI 생성 후 필요한 파일만 루트에 반영
- `--skip-install`, `--skip-git`, `--strict` 옵션 사용
