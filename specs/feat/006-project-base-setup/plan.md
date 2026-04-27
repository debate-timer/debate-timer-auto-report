# Implementation Plan: Phase 1-1 프로젝트 기반 구성

**Branch**: `feat/#6-project-base-setup` | **Date**: 2026-04-23 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/feat/006-project-base-setup/spec.md`

## Summary

NestJS 애플리케이션에 환경변수 유효성 검증, `/health` 엔드포인트, 구조화된 JSON 로그(nestjs-pino), Prisma 기반 4개 핵심 테이블, `timer_started` seed를 구성한다. Walking Skeleton의 데이터 저장 기반을 확립하는 것이 핵심 목표다.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode — `noImplicitAny`, `strictNullChecks`)  
**Primary Dependencies**: NestJS 11, Prisma 7, @prisma/adapter-pg, pg, dotenv, nestjs-pino, @nestjs/config + Joi  
**Storage**: PostgreSQL (로컬 개발 환경), Prisma ORM  
**Testing**: Jest 30 + @nestjs/testing + supertest  
**Target Platform**: Node.js LTS, Linux server (Docker, ARM64)  
**Project Type**: NestJS 백엔드 단일 프로젝트  
**Performance Goals**: `/health` 100ms 이내 응답 (로컬 기준)  
**Constraints**: 환경변수 누락 시 기동 5초 이내 종료, DB 연결 실패 시 즉시 종료 (재시도 없음)  
**Scale/Scope**: Phase 1 (로컬 개발 환경), 이후 Phase 확장 기반

## Constitution Check

| Gate | Status | Notes |
|------|--------|-------|
| 모듈별 `{domain}.module.ts` 먼저 작성 | PASS | config/, health/, prisma/ 각각 모듈 파일 생성 |
| `nestjs-best-practices` 스킬 참조 | REQUIRED | 구현 시 반드시 참조 |
| TDD (Red-Green-Refactor) | PASS | 모든 파일에 `.spec.ts` 먼저 작성 |
| 테스트 설명 한국어 | PASS | describe/it/test 한국어로 작성 |
| 환경변수 Joi/Zod 스키마 검증 | PASS | Joi 사용 (설치 필요) |
| 타임존 Asia/Seoul | N/A | Phase 1-1은 날짜 계산 미포함 |
| 민감정보 커밋 금지 | PASS | .env.example만 커밋, .env 제외 |

**추가 설치 필요**: `npm install joi @prisma/adapter-pg pg dotenv`, `npm install --save-dev pino-pretty @types/pg`

## Project Structure

### Documentation (this feature)

```text
specs/feat/006-project-base-setup/
├── plan.md              ← 이 파일
├── research.md          ← 사전 연구 결과
├── data-model.md        ← Phase 1-1 데이터 모델
├── contracts/
│   └── health.md        ← GET /health 계약
├── test-contracts/
│   ├── config.md        ← config 모듈 테스트 명세
│   ├── health.md        ← health 모듈 테스트 명세
│   └── prisma.md        ← prisma 모듈 테스트 명세
└── tasks.md             ← 구현 태스크 목록
```

### Source Code (repository root)

```text
src/
├── generated/
│   └── prisma/                 # Prisma 7 generated client
├── modules/
│   ├── config/
│   │   ├── config.module.ts          # ConfigModule 래퍼
│   │   ├── config.schema.ts          # Joi 환경변수 검증 스키마
│   │   └── config.schema.spec.ts     # 단위 테스트 (TDD RED 먼저)
│   ├── health/
│   │   ├── health.module.ts
│   │   ├── health.controller.ts      # GET /health
│   │   └── health.controller.spec.ts # 단위 테스트 (TDD RED 먼저)
│   └── prisma/
│       ├── prisma.module.ts
│       ├── prisma.service.ts         # PrismaClient + PrismaPg adapter 래퍼
│       └── prisma.service.spec.ts    # 단위 테스트 (TDD RED 먼저)
├── app.module.ts                 # ConfigModule, PinoModule, HealthModule, PrismaModule 등록
└── main.ts                       # Logger 교체 (pino), 전역 파이프 등록
prisma/
├── schema.prisma                 # 4개 핵심 테이블 정의
└── seed.ts                       # timer_started 초기 데이터 (upsert)
prisma.config.ts                  # Prisma 7 datasource URL 및 seed 명령 설정
```

**Structure Decision**: NestJS 표준 도메인별 모듈 구조 (`src/modules/{domain}/`). Phase 1-1은 config, health, prisma 3개 도메인으로 시작한다. Prisma 7 generated client는 `src/generated/prisma`에 둔다.

## Architecture Decision Table

| Decision | Options Considered | Chosen | Rationale | Testability |
|----------|-------------------|--------|-----------|-------------|
| 환경변수 검증 라이브러리 | Joi, Zod, class-validator | **Joi** | @nestjs/config 공식 예제가 Joi 기반; 추가 설정 없이 forRoot에서 `validationSchema` 옵션 사용 가능 | 스키마를 별도 파일로 분리하면 단위 테스트 용이 |
| Health 엔드포인트 | @nestjs/terminus, 커스텀 컨트롤러 | **커스텀 컨트롤러** | Phase 1-1은 단순 alive 확인만 필요; terminus는 DB ping 등 추가 의존성이 생겨 오버스펙 | 간단한 컨트롤러로 단위 테스트 용이 |
| Prisma 7 datasource | schema.prisma `url`, `prisma.config.ts` | **prisma.config.ts** | Prisma 7 CLI는 migration datasource URL을 config 파일에서 읽음. schema에는 provider만 둠 | `npx prisma validate`와 `npx prisma migrate dev`로 검증 |
| Prisma 7 generator | 기존 JS generator, Prisma 7 TypeScript generator | **`prisma-client` + `output = "../src/generated/prisma"`** | Prisma 7 신규 프로젝트는 generated client output 경로가 명시되어야 함 | `npx prisma generate`, TypeScript import 검증 |
| Prisma 서비스 | PrismaService extends PrismaClient, 별도 래퍼 | **extends PrismaClient + PrismaPg adapter** | Prisma 7 Client는 driver adapter 필요. 로컬 PostgreSQL은 `@prisma/adapter-pg` 사용 | generated PrismaClient, `@prisma/adapter-pg`, `ConfigService` mock으로 격리 테스트 |
| 로깅 | NestJS 내장 Logger, winston, nestjs-pino | **nestjs-pino** | 이미 package.json에 포함, JSON 구조화 로그 출력, pino-http로 HTTP 요청 자동 로깅 | 테스트에서 pino 비활성화 가능 |
| Seed 실행 방식 | Prisma config seed, package.json prisma.seed, NestJS OnApplicationBootstrap | **Prisma config seed** (`prisma.config.ts` → `prisma/seed.ts`) | Prisma 7 설정 위치와 일치. DB 마이그레이션과 분리하고 `prisma db seed`로 독립 실행 가능 | `upsert` 사용으로 중복 안전 |

## TDD Implementation Order

Red-Green-Refactor 사이클을 다음 순서로 진행한다:

### Step 1: 타입 정의 (테스트 없음)
- `prisma/schema.prisma` — 4개 테이블 스키마 작성 (`@map`으로 snake_case 컬럼 고정, datasource `url` 없음, `prisma-client` generator output 설정)
- `prisma.config.ts` — Prisma 7 datasource URL 및 seed 명령 설정
- `npx prisma validate` 로 스키마 검증
- `npx prisma generate` 로 `src/generated/prisma` client 생성
- `npx prisma migrate dev --name init` 로 마이그레이션

### Step 2: config 모듈 (RED → GREEN → REFACTOR)
1. **RED**: `src/modules/config/config.schema.spec.ts` — 필수 환경변수 누락/형식 오류 검증 테스트 작성
2. **GREEN**: `src/modules/config/config.schema.ts` — Joi 스키마 구현
3. `src/modules/config/config.module.ts` — ConfigModule 래퍼 구현

### Step 3: prisma 모듈 (RED → GREEN → REFACTOR)
1. **RED**: `src/modules/prisma/prisma.service.spec.ts` — 연결/해제 훅 테스트 작성
2. **GREEN**: `src/modules/prisma/prisma.service.ts` — `ConfigService`에서 `DATABASE_URL`을 읽고 `PrismaPg` adapter로 PrismaService 구현
3. `src/modules/prisma/prisma.module.ts` — PrismaModule 구현

### Step 4: health 모듈 (RED → GREEN → REFACTOR)
1. **RED**: `src/modules/health/health.controller.spec.ts` — GET /health 응답 테스트 작성
2. **GREEN**: `src/modules/health/health.controller.ts` — HealthController 구현
3. `src/modules/health/health.module.ts` — HealthModule 구현

### Step 5: 앱 조립 및 통합 (RED → GREEN)
1. **RED**: `test/app.e2e-spec.ts` — /health E2E 테스트 추가
2. **GREEN**: `src/app.module.ts` — 모든 모듈 등록
3. `src/main.ts` — pino 로거 교체, 전역 설정
4. `prisma/seed.ts` — `PrismaPg` adapter를 사용한 timer_started upsert seed 스크립트

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|-----------|--------------------------------------|
| Prisma seed 스크립트 분리 | DB 마이그레이션과 seed를 독립 실행하기 위해 | OnApplicationBootstrap는 운영 배포 시 매번 seed가 실행되는 부작용 있음 |
