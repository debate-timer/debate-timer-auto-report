# Current Phase Checklist

현재 활성 Phase: `Phase 1. Walking Skeleton`

> Phase 0 완료 (2026-04-23): ADR 001 작성, SRS 11.1 수정, `.env.example` 작성, 모든 완료 기준 충족.

## 목표

가장 얇은 end-to-end 파이프라인을 먼저 완성한다.

**이 단계의 실행 기준은 로컬 개발 환경이다.**

> 핵심 한 줄: 수동 또는 스케줄 실행 → Amplitude 지표 1개 조회 → DB 저장 → Discord 테스트 채널 전송

현재는 Phase 1을 다음 세부 단계로 나누어 진행한다.

| 세부 Phase | 범위 | 기준 문서 |
|---|---|---|
| Phase 1-1 | 프로젝트 기반 구성: config, health, logging, Prisma/PostgreSQL, seed | `specs/feat/006-project-base-setup/` |
| Phase 1-2 | Amplitude 지표 1개 조회 및 스냅샷 저장 | 작성 예정 |
| Phase 1-3 | 수동/스케줄 실행과 Discord 테스트 전송 | 작성 예정 |

## Phase 1 체크리스트

### Phase 1-1. 프로젝트 기반 구성

- [x] NestJS 프로젝트 초기화
- [ ] `ConfigModule` 적용 (`.env` 기반 환경변수 로드)
- [ ] Pino 로깅 적용
- [ ] `/health` 엔드포인트 추가
- [ ] Prisma 초기화 및 PostgreSQL 연결
- [ ] 최소 스키마 생성 및 migration 1회 수행
  - `metric_definitions`
  - `metric_snapshots`
  - `report_runs`
  - `deliveries`
- [ ] 핵심 지표 1개 seed 등록 (`timer_started`)

### Phase 1-2. 지표 수집

- [ ] `MetricSourceAdapter` 인터페이스 최소 정의
- [ ] `AmplitudeMetricSourceAdapter` 구현 (지표 1개 조회)
- [ ] `timer_started` 조회 결과를 `metric_snapshots`에 저장

### Phase 1-3. 실행 파이프라인

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

- 기본 NestJS 프로젝트는 이미 생성되어 있으므로 `/init` 또는 Nest CLI scaffold를 다시 통째로 실행하지 않는다.
- 추가 scaffold가 필요하면 임시 폴더에서 Nest CLI 생성 후 필요한 파일만 루트에 반영한다.
- 신규 scaffold에는 `--skip-install`, `--skip-git`, `--strict` 옵션을 사용한다.
