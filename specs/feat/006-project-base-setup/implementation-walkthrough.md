# Phase 1-1 Implementation Walkthrough

이 문서는 `codex:implement`로 이미 진행된 Phase 1-1 작업을 초보자 관점에서 다시 설명한다.

원래 진행 방식은 다음 순서였어야 한다.

```text
설명 → trade-off → 실행할 CLI 명령 제시 → 사용자 승인 → 실행 → 결과 공유 → 다음 단계 승인
```

## 0. 작업 범위 확인

먼저 현재 어떤 spec을 구현해야 하는지 확인한다.

```bash
.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks
```

확인된 대상:

```text
specs/feat/006-project-base-setup
```

읽어야 하는 문서:

```text
plan.md
tasks.md
research.md
data-model.md
contracts/
```

초보자 설명:

> 이번 작업은 NestJS 백엔드에 환경변수 검증, `/health`, Prisma DB 스키마, seed, 구조화 로그를 붙이는 프로젝트 기반 구성이다.

승인 체크포인트:

> Phase 1 패키지 설치와 Prisma 기본 설정부터 진행해도 될까요?

## 1. 패키지 설치

실행 명령:

```bash
npm install joi @prisma/adapter-pg pg dotenv
npm install --save-dev pino-pretty @types/pg
```

각 패키지 역할:

- `joi`: 환경변수 검증
- `@prisma/adapter-pg`, `pg`: Prisma 7 PostgreSQL 연결
- `dotenv`: `.env` 로딩
- `pino-pretty`: 개발 환경 로그 가독성
- `@types/pg`: PostgreSQL 드라이버 타입

승인 체크포인트:

> 의존성이 추가됩니다. 이 패키지들을 설치해도 될까요?

## 2. Prisma 설정과 스키마 작성

작성 파일:

```text
prisma.config.ts
prisma/schema.prisma
```

검증 명령:

```bash
env DATABASE_URL=postgresql://user:pass@localhost:5432/debate_timer npx prisma validate
env DATABASE_URL=postgresql://user:pass@localhost:5432/debate_timer npx prisma generate
```

초보자 설명:

- `prisma.config.ts`: Prisma CLI가 schema, DB URL, seed 명령을 읽는 설정 파일
- `schema.prisma`: DB 테이블과 enum을 정의하는 파일
- `prisma validate`: Prisma 문법 검증
- `prisma generate`: TypeScript 코드에서 사용할 Prisma Client 생성

중요 결정:

```prisma
generator client {
  provider            = "prisma-client"
  output              = "../src/generated/prisma"
  moduleFormat        = "cjs"
  importFileExtension = "ts"
}
```

이 결정은 승인받고 진행했어야 한다.

승인 체크포인트:

> Prisma generated client 설정을 CommonJS/ts-node 친화적으로 고정해도 될까요?

## 3. DB Migration 시도

실행 명령:

```bash
env DATABASE_URL=postgresql://user:pass@localhost:5432/debate_timer npx prisma migrate dev --name init
```

결과:

```text
P1001: Can't reach database server at localhost:5432
```

초보자 설명:

> Prisma schema는 유효하지만, 실제 PostgreSQL 서버가 `localhost:5432`에서 실행 중이지 않아 테이블 생성은 못 했다. 그래서 `tasks.md`의 T006은 완료 처리하지 않는다.

승인 체크포인트:

> DB migration은 보류하고, DB 없이 가능한 NestJS 코드와 테스트 구현을 계속해도 될까요?

## 4. 환경변수 검증 모듈 TDD

테스트 파일:

```text
src/modules/config/config.schema.spec.ts
```

RED 확인:

```bash
npx jest src/modules/config/config.schema.spec.ts --watchman=false
```

초기 실패:

```text
Cannot find module './config.schema'
```

초보자 설명:

> 아직 구현 파일이 없기 때문에 실패하는 것이 정상이다. TDD에서는 먼저 실패하는 테스트를 보고, 그 다음 최소 구현으로 통과시킨다.

구현 파일:

```text
src/modules/config/config.schema.ts
src/modules/config/config.module.ts
```

GREEN 확인:

```bash
npx jest src/modules/config/config.schema.spec.ts --watchman=false
```

결과:

```text
23 tests passed
```

승인 체크포인트:

> RED가 의도대로 확인됐습니다. 이제 Joi 스키마를 구현해서 GREEN으로 바꿔도 될까요?

## 5. Health API 모듈 TDD

테스트 파일:

```text
src/modules/health/health.controller.spec.ts
```

RED 확인:

```bash
npx jest src/modules/health/health.controller.spec.ts --watchman=false
```

초기 실패:

```text
Cannot find module './health.controller'
```

구현 파일:

```text
src/modules/health/health.controller.ts
src/modules/health/health.module.ts
```

GREEN 확인:

```bash
npx jest src/modules/health/health.controller.spec.ts --watchman=false
```

결과:

```text
2 tests passed
```

초보자 설명:

> `/health`는 DB 상태를 확인하지 않고 `{ status: 'ok' }`만 반환하는 alive endpoint다.

승인 체크포인트:

> HealthController는 DB 없이 단순 alive 응답만 하도록 구현해도 될까요?

## 6. PrismaService 모듈 TDD

테스트 파일:

```text
src/modules/prisma/prisma.service.spec.ts
```

RED 확인:

```bash
npx jest src/modules/prisma/prisma.service.spec.ts --watchman=false
```

초기 실패:

```text
Cannot find module './prisma.service'
```

구현 파일:

```text
src/modules/prisma/prisma.service.ts
src/modules/prisma/prisma.module.ts
```

GREEN 확인:

```bash
npx jest src/modules/prisma/prisma.service.spec.ts --watchman=false
```

결과:

```text
4 tests passed
```

초보자 설명:

> `PrismaService`는 NestJS 앱 시작 시 `$connect()`를 호출하고, 종료 시 `$disconnect()`를 호출한다. DB 연결 실패 시 예외가 전파되므로 서비스 기동이 중단된다.

승인 체크포인트:

> DB 연결 실패 시 재시도 없이 바로 실패시키는 fail-fast 구조로 진행해도 될까요?

## 7. Seed 스크립트 작성

작성 파일:

```text
prisma/seed.ts
```

실행 명령:

```bash
env DATABASE_URL=postgresql://user:pass@localhost:5432/debate_timer npx prisma db seed
```

현재 결과:

```text
ECONNREFUSED
```

초보자 설명:

> seed 스크립트는 실행되지만 PostgreSQL 서버가 없어서 실제 upsert는 실패한다.

핵심 구현:

```typescript
upsert({
  where: { key: 'timer_started' },
  update: {},
  create: { ... },
})
```

초보자 설명:

> `upsert`는 레코드가 있으면 유지하고, 없으면 생성한다. 그래서 seed를 여러 번 실행해도 `timer_started`가 중복 생성되지 않는다.

승인 체크포인트:

> 기본 지표 `timer_started`를 seed로 넣고, 중복 방지를 위해 `upsert`를 써도 될까요?

## 8. AppModule 조립과 E2E 테스트

수정 파일:

```text
src/app.module.ts
src/main.ts
test/app.e2e-spec.ts
```

RED 확인:

```bash
npm run test:e2e -- --watchman=false
```

의미 있는 초기 실패:

```text
expected 200, got 404
```

초보자 설명:

> `/health` 컨트롤러는 만들었지만 아직 `AppModule`에 연결하지 않았기 때문에 404가 발생했다.

구현 방향:

```typescript
imports: [
  ConfigModule,
  LoggerModule.forRoot(...),
  HealthModule,
  PrismaModule,
]
```

`main.ts` 설정:

```typescript
const app = await NestFactory.create(AppModule, { bufferLogs: true });
app.useLogger(app.get(Logger));
app.useGlobalPipes(new ValidationPipe());
```

GREEN 확인:

```bash
npm run test:e2e
```

결과:

```text
1 test passed
```

중요 결정:

> `/health` e2e 테스트에서는 실제 DB 연결을 피하기 위해 `PrismaService`를 mock 처리했다. `/health` 계약이 DB 상태 확인이 아니라 alive 응답이기 때문이다.

승인 체크포인트:

> `/health` e2e에서는 PrismaService를 mock해서 DB 없이 테스트하도록 해도 될까요?

## 9. npm Test Script 수정

수정 내용:

```json
{
  "test": "jest --watchman=false",
  "test:e2e": "jest --config ./test/jest-e2e.json --watchman=false"
}
```

초보자 설명:

> 이 환경에서는 Jest가 Watchman을 사용하려고 하면 권한 문제로 실패했다. 그래서 테스트가 안정적으로 돌도록 `--watchman=false`를 붙였다.

승인 체크포인트:

> 테스트 스크립트에 `--watchman=false`를 기본값으로 넣어도 될까요?

## 10. 최종 검증

실행 명령:

```bash
npm test
npm run test:e2e
npm run build
npm run lint
env DATABASE_URL=postgresql://user:pass@localhost:5432/debate_timer npx prisma validate
```

결과:

```text
npm test         → 4 suites, 30 tests passed
npm run test:e2e → 1 test passed
npm run build    → passed
npm run lint     → passed
prisma validate  → schema valid
```

DB 관련 남은 명령:

```bash
env DATABASE_URL=postgresql://user:pass@localhost:5432/debate_timer npx prisma migrate dev --name init
env DATABASE_URL=postgresql://user:pass@localhost:5432/debate_timer npx prisma db seed
```

현재 결과:

```text
migrate → P1001, PostgreSQL 서버 없음
seed    → ECONNREFUSED, PostgreSQL 서버 없음
```

## CommonJS vs ESM 결정 메모

현재 구현은 Prisma generated client를 CommonJS로 고정했다.

```prisma
moduleFormat        = "cjs"
importFileExtension = "ts"
```

당시 이유:

- `ts-node prisma/seed.ts`가 Prisma 7 generated TypeScript client를 로딩할 때 ESM/CJS 충돌이 발생했다.
- 빠르게 seed 스크립트 실행 경로를 복구하기 위해 CommonJS로 고정했다.

하지만 장기적으로는 ESM이 더 적합할 가능성이 높다.

Prisma 공식 문서 기준:

- `prisma-client` generator는 ESM, Bun, Deno 등 다양한 JavaScript 환경을 지원하기 위한 새 generator다.
- `moduleFormat`은 `esm` 또는 `cjs`를 선택할 수 있다.
- Prisma Schema API 문서는 특별한 이유가 없다면 ESM을 권장한다고 설명한다.
- TypeScript runner가 `.js` import를 `.ts` 파일로 해석하지 못하는 경우 `importFileExtension = "ts"`를 설정하라고 안내한다.

ESM으로 가려면 단순히 Prisma generator만 바꾸면 끝나지 않는다. 최소한 다음을 함께 검토해야 한다.

1. `prisma/schema.prisma`

   ```prisma
   generator client {
     provider            = "prisma-client"
     output              = "../src/generated/prisma"
     moduleFormat        = "esm"
     importFileExtension = "ts"
   }
   ```

2. seed 실행기

   현재:

   ```bash
   ts-node prisma/seed.ts
   ```

   ESM 친화 후보:

   ```bash
   tsx prisma/seed.ts
   ```

3. `prisma.config.ts`

   ```typescript
   migrations: {
     seed: 'tsx prisma/seed.ts',
   }
   ```

4. 검증 명령

   ```bash
   npm install --save-dev tsx
   env DATABASE_URL=postgresql://user:pass@localhost:5432/debate_timer npx prisma generate
   env DATABASE_URL=postgresql://user:pass@localhost:5432/debate_timer npx prisma db seed
   npm test
   npm run test:e2e
   npm run build
   npm run lint
   ```

추천:

> 이 프로젝트의 학습/포트폴리오 목적을 고려하면 ESM 방향이 더 설명하기 좋다. 다만 Jest, Nest build, ts-node/tsx, Prisma seed 실행 경로에 영향을 주므로 별도 승인된 작업으로 전환하는 것이 안전하다.

## 남은 작업

- PostgreSQL 로컬 서버 준비
- `npx prisma migrate dev --name init` 재실행
- `npx prisma db seed` 2회 실행
- `timer_started`가 1행만 존재하는지 확인
- CommonJS 유지 또는 ESM 전환 결정
