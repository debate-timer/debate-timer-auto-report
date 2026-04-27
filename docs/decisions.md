# 전역 의사결정 기록

전역적으로 유지할 결정과 아직 열어둔 항목을 함께 기록한다.

## 현재 고정된 방향

### 문서 구조

- 모든 핵심 문서는 `docs/` 아래에서 관리한다.
- 문서 진입점은 [README.md](./README.md)다.
- 체크리스트는 `master-checklist.md`와 `current-phase-checklist.md` 두 개만 운영한다.

### 현재 작업 범위

- 현재 활성 Phase는 `Phase 1. Walking Skeleton`이다.
- 현재 세부 작업은 `Phase 1-1. 프로젝트 기반 구성`이다.
- Phase 1-1은 환경변수 검증, `/health`, 구조화 로그, Prisma/PostgreSQL 기반 4개 핵심 테이블, `timer_started` seed를 완료 범위로 둔다.
- Amplitude 조회와 Discord 전송은 Phase 1-2/1-3에서 같은 실행 경로 위에 추가한다.

### 향후 부트스트랩 원칙

- 기본 NestJS 프로젝트는 이미 생성되어 있다.
- 추가 scaffold가 필요하면 임시 폴더에서 생성 후 필요한 파일만 루트에 반영한다.
- 신규 scaffold 기본 옵션은 `--skip-install`, `--skip-git`, `--strict`를 사용한다.

## 참고할 문서상 권장안

- 기술 스택과 운영 원칙은 [tech-stack.md](./tech-stack.md)를 기준으로 본다.
- 전체 구현 순서와 Phase 정의는 [implementation-plan.md](./implementation-plan.md)를 기준으로 본다.
- AI 선택 근거는 [ai-framework-selection.md](./ai-framework-selection.md)를 기준으로 본다.

## 확정된 추가 결정

- **Amplitude-first 전략**: GA4 연동 없음, Sentry는 2차, AI는 placeholder만. [ADR 001](./adr/001-amplitude-first.md) 참조.
- **환경변수 구조**: 루트 `.env.example` 기준으로 관리. 채널별 Discord Webhook 분리.
- **AI**: 1차에서 비활성화(`AI_ENABLED=false`). 2차에서 Gemini API 무료 티어로 시작.
- **DB/ORM**: PostgreSQL + Prisma 7 확정.
- **Prisma 7 구성**: datasource URL은 `prisma.config.ts`에서 관리하고, Prisma Client는 `prisma-client` generator와 명시적 output 경로를 사용한다.
- **Phase 1-1 환경변수 검증**: `@nestjs/config` + Joi를 사용한다.
- **Phase 1-1 로깅**: `nestjs-pino`를 사용하고 개발 환경에서는 `pino-pretty`를 허용한다.

## 아직 확정이 필요한 항목

- 지표별 경고 임계치 초기값 (Phase 2 착수 전 확정 필요)
- 발송 주기·시각 최종 확인 (기본안: 주간 월요일 09:00, 월간 1일 09:00 KST)
- Phase 1-2/1-3의 정확한 feature spec 분리 방식
