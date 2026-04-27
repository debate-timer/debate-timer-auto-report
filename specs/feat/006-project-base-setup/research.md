# Research: Phase 1-1 프로젝트 기반 구성

**Branch**: `feat/#6-project-base-setup` | **Date**: 2026-04-23

## 연구 항목 및 결론

### 1. 환경변수 검증 라이브러리 선택

**결정**: Joi

**Rationale**:
- `@nestjs/config`의 `ConfigModule.forRoot({ validationSchema })` 옵션이 Joi를 직접 지원
- `joi` 패키지 단독 설치로 사용 가능 (`@hapi/joi` 아님)
- Zod는 `@nestjs/config`와 연동 시 `validate` 함수를 직접 구현해야 해 추가 코드 필요
- Phase 1에서는 복잡한 타입 변환이 없으므로 Joi로 충분

**설치 명령**: `npm install joi`

**Alternatives considered**:
- **Zod**: 타입 추론이 뛰어나지만 `@nestjs/config` 직접 통합 안 됨; Phase 8 AI SDK(Zod 사용)와의 일관성 고려 시 추후 마이그레이션 가능
- **class-validator**: DTO 검증용이므로 환경변수 검증에는 부적합

---

### 2. Health Check 엔드포인트 구현 방식

**결정**: 커스텀 컨트롤러 (`HealthController`)

**Rationale**:
- Phase 1 요구사항은 단순 alive 확인 (`{ status: 'ok' }`)
- `@nestjs/terminus`는 DB, Redis, HTTP 등 다양한 헬스 인디케이터를 제공하지만 현재 범위 초과
- 커스텀 컨트롤러가 테스트와 유지보수가 더 단순

**Alternatives considered**:
- **@nestjs/terminus**: 이후 Phase에서 DB 연결 상태 확인이 필요해지면 마이그레이션 고려

---

### 3. Prisma 서비스 패턴

**결정**: `PrismaService extends PrismaClient` + `@prisma/adapter-pg`

**Rationale**:
- NestJS Prisma 통합에서 `PrismaService extends PrismaClient`는 모듈 생명주기 훅을 붙이기 쉬운 표준 패턴
- 현재 프로젝트의 Prisma 버전은 7.x이며, Prisma 7 신규 프로젝트는 `prisma-client` generator와 명시적 output 경로를 사용함
- 생성된 Prisma 7 Client는 PostgreSQL driver adapter를 생성자에 전달해야 함
- 로컬 PostgreSQL 연결은 `@prisma/adapter-pg`의 `PrismaPg` adapter로 처리
- `onModuleInit()` → `this.$connect()`, `onModuleDestroy()` → `this.$disconnect()`
- 전체 PrismaClient API를 그대로 노출하므로 Repository에서 직접 사용 가능

**DB 연결 실패 동작**:
- `$connect()` 실패 시 예외가 throw되어 NestJS 기동이 중단됨 (FR-007 충족)
- Phase 1은 재시도 없음 (spec Assumptions 확인)

**구현 예시**:

```typescript
constructor(configService: ConfigService) {
  const connectionString = configService.getOrThrow<string>('DATABASE_URL');
  super({
    adapter: new PrismaPg({ connectionString }),
  });
}
```

`PrismaClient`는 `@prisma/client`가 아니라 `src/generated/prisma/client`에서 import한다.

**설치 명령**: `npm install @prisma/adapter-pg pg dotenv`, `npm install --save-dev @types/pg`

---

### 4. pino 로그 설정

**결정**: `nestjs-pino` + `pino-http` 조합, `PinoLogger` 교체

**설정 방식**:
```typescript
// main.ts
const app = await NestFactory.create(AppModule, { bufferLogs: true });
app.useLogger(app.get(Logger));
```

```typescript
// app.module.ts
LoggerModule.forRoot({
  pinoHttp: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty' } : undefined,
  },
}),
```

**pino-pretty 개발 환경 가독성**: `npm install --save-dev pino-pretty`

---

### 5. Prisma seed 실행 방식

**결정**: `prisma/seed.ts` + `prisma.config.ts`의 `migrations.seed` 설정

**prisma.config.ts에 추가**:

```typescript
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    seed: 'ts-node prisma/seed.ts',
  },
});
```

**실행**: `npx prisma db seed`

**중복 방지**: `upsert({ where: { key: 'timer_started' }, ... })`

**주의**: Prisma 7에서는 `schema.prisma`의 `datasource db`에 `url = env("DATABASE_URL")`를 두지 않는다. migration/seed 실행용 URL은 `prisma.config.ts`에서 관리한다.

**generator**: Prisma 7 신규 프로젝트는 `provider = "prisma-client"`와 `output = "../src/generated/prisma"`를 사용한다.

---

### 6. 4개 핵심 테이블 스키마

spec의 Key Entities 기반으로 설계 (상세는 `data-model.md` 참조):
- `metric_definitions`
- `metric_snapshots`
- `report_runs`
- `deliveries`

**데이터 형식 결정**:

- Prisma 필드는 `camelCase`, PostgreSQL 테이블/컬럼은 `snake_case`로 고정 (`@map`, `@@map` 사용)
- `querySpec`, `warningRule`, `rawRef`, `responseRef` JSON에는 `version` 필수
- 지표 값은 `Decimal(20, 6)`으로 저장하고 `unit`으로 count/rate/percent 해석을 구분
- 세그먼트가 없는 전체 값은 `segmentKey = "ALL"`, `segmentValue = "ALL"`로 저장해 unique 제약이 중복을 막도록 함
- 기간 범위는 KST 기준으로 계산하되 UTC `[periodStart, periodEnd)` 반열림 구간으로 저장
