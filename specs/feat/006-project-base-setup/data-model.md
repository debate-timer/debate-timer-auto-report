# Data Model: Phase 1-1 프로젝트 기반 구성

**Branch**: `feat/#6-project-base-setup` | **Date**: 2026-04-23  
**Updated**: 2026-04-24

## 설계 원칙

spec.md의 Key Entities 기반으로 Prisma 스키마를 설계한다. Phase 1-1의 범위는 4개 핵심 테이블(`metric_definitions`, `metric_snapshots`, `report_runs`, `deliveries`)과 `timer_started` seed까지다.

데이터 형식은 다음 원칙을 따른다.

- Prisma 모델 필드는 TypeScript/NestJS 코드에서 쓰기 좋은 `camelCase`를 사용한다.
- 실제 PostgreSQL 테이블과 컬럼은 운영 SQL, 문서, 기존 설계와 맞추기 위해 `snake_case`로 고정한다.
- `querySpec`, `warningRule`, `rawRef`, `responseRef`처럼 JSON으로 저장하는 값은 반드시 `version` 필드를 포함한다.
- 기간은 KST 기준으로 계산하되 DB에는 UTC `DateTime`으로 저장한다.
- 기간 범위는 `[periodStart, periodEnd)` 반열림 구간으로 저장한다. 예: 주간은 월요일 00:00 KST 이상, 다음 월요일 00:00 KST 미만.
- Webhook URL, API Key, Authorization header 같은 민감정보는 어떤 JSON 필드에도 저장하지 않는다.

---

## Prisma 7 구성 전제

현재 프로젝트는 Prisma 7을 사용한다. Prisma 7에서는 마이그레이션 datasource URL을 `schema.prisma` 내부 `url = env("DATABASE_URL")`에 두지 않고 `prisma.config.ts`에서 관리한다. 또한 신규 프로젝트는 `prisma-client` generator와 명시적 `output` 경로를 사용하며, `PrismaClient` 생성 시 PostgreSQL Driver Adapter가 필요하다.

```typescript
// prisma.config.ts
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

```typescript
// prisma/seed.ts 기준 PrismaClient 생성 예시
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});
```

필요 패키지:

- runtime: `@prisma/adapter-pg`, `pg`, `dotenv`
- dev: `@types/pg`

`@prisma/client` 패키지는 Prisma Client 런타임 의존성으로 유지하되, 애플리케이션 코드는 생성된 client 경로(`src/generated/prisma/client`)에서 import한다.
예를 들어 `src/modules/prisma/prisma.service.ts`에서는 `../../generated/prisma/client` 상대 경로를 사용한다.

---

## Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

// 지표 정의 — 수집 대상 지표를 식별하는 레코드
model MetricDefinition {
  id               String       @id @default(cuid())
  key              String       @unique
  name             String
  description      String?
  source           MetricSource @default(AMPLITUDE)
  unit             MetricUnit   @default(COUNT)
  querySpec        Json         @map("query_spec")
  querySpecVersion Int          @default(1) @map("query_spec_version")
  direction        Direction
  minSampleSize    Int          @default(30) @map("min_sample_size")
  warningRule      Json?        @map("warning_rule")
  isActive         Boolean      @default(true) @map("is_active")
  createdAt        DateTime     @default(now()) @map("created_at")
  updatedAt        DateTime     @updatedAt @map("updated_at")

  snapshots MetricSnapshot[]

  @@map("metric_definitions")
}

// 지표 스냅샷 — 특정 기간의 지표 수집값
model MetricSnapshot {
  id                 String       @id @default(cuid())
  metricDefinitionId String       @map("metric_definition_id")
  source             MetricSource @default(AMPLITUDE)
  periodType         PeriodType   @map("period_type")
  periodKey          String       @map("period_key")
  periodStart        DateTime     @map("period_start")
  periodEnd          DateTime     @map("period_end")
  segmentKey         String       @default("ALL") @map("segment_key")
  segmentValue       String       @default("ALL") @map("segment_value")
  value              Decimal      @db.Decimal(20, 6)
  sampleSize         Int          @map("sample_size")
  querySpecVersion   Int          @map("query_spec_version")
  rawRef             Json?        @map("raw_ref")
  collectedAt        DateTime     @default(now()) @map("collected_at")

  definition MetricDefinition @relation(fields: [metricDefinitionId], references: [id], onDelete: Restrict)

  @@unique([metricDefinitionId, periodType, periodKey, segmentKey, segmentValue])
  @@index([periodType, periodKey])
  @@index([source])
  @@map("metric_snapshots")
}

// 실행 이력 — 리포트 실행 단위
model ReportRun {
  id              String      @id @default(cuid())
  runType         RunType     @map("run_type")
  targetPeriodKey String      @map("target_period_key")
  reportVersion   Int         @default(1) @map("report_version")
  idempotencyKey  String      @unique @map("idempotency_key")
  status          RunStatus   @default(PENDING)
  triggerType     TriggerType @map("trigger_type")
  startedAt       DateTime?   @map("started_at")
  completedAt     DateTime?   @map("completed_at")
  errorSummary    String?     @map("error_summary")
  createdAt       DateTime    @default(now()) @map("created_at")
  updatedAt       DateTime    @updatedAt @map("updated_at")

  deliveries Delivery[]

  @@unique([runType, targetPeriodKey, reportVersion])
  @@index([status])
  @@map("report_runs")
}

// 전송 이력 — Discord 전송 시도 기록
model Delivery {
  id            String         @id @default(cuid())
  reportRunId   String         @map("report_run_id")
  channelType   DeliveryChannel @map("channel_type")
  channelTarget String         @map("channel_target")
  status        DeliveryStatus @default(PENDING)
  attemptCount  Int            @default(0) @map("attempt_count")
  sentAt        DateTime?      @map("sent_at")
  responseRef   Json?          @map("response_ref")
  errorSummary  String?        @map("error_summary")
  createdAt     DateTime       @default(now()) @map("created_at")
  updatedAt     DateTime       @updatedAt @map("updated_at")

  reportRun ReportRun @relation(fields: [reportRunId], references: [id], onDelete: Restrict)

  @@index([reportRunId])
  @@index([status])
  @@map("deliveries")
}

// ─── Enums ───────────────────────────────────────

enum MetricSource {
  AMPLITUDE
}

enum MetricUnit {
  COUNT
  RATIO
  PERCENT
  MILLISECONDS
}

enum Direction {
  HIGHER_IS_BETTER
  LOWER_IS_BETTER
}

enum PeriodType {
  WEEKLY
  MONTHLY
}

enum RunType {
  WEEKLY_REPORT
  MONTHLY_REPORT
  ALERT
}

enum RunStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
}

enum TriggerType {
  SCHEDULE
  MANUAL
}

enum DeliveryChannel {
  TEST
  REPORT
  ALERT
  OPS
}

enum DeliveryStatus {
  PENDING
  SENT
  FAILED
}
```

---

## 엔티티 관계

```text
MetricDefinition 1 ──< MetricSnapshot (기간별 스냅샷)
ReportRun        1 ──< Delivery       (채널별 전송 이력)
```

---

## 표준 데이터 형식

### MetricDefinition.querySpec

`querySpec`은 원천별 조회 방법을 저장한다. Phase 1-1 seed는 Amplitude 이벤트 카운트만 사용한다.

```json
{
  "version": 1,
  "source": "AMPLITUDE",
  "kind": "EVENT_COUNT",
  "eventType": "timer_started",
  "aggregation": "EVENT_COUNT",
  "filters": [],
  "groupBy": []
}
```

필드 규칙:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | `1` | Yes | querySpec 형식 버전 |
| `source` | `"AMPLITUDE"` | Yes | MetricDefinition.source와 동일해야 함 |
| `kind` | `"EVENT_COUNT"` | Yes | Phase 1-1에서 지원하는 조회 유형 |
| `eventType` | `string` | Yes | Amplitude 이벤트명 |
| `aggregation` | `"EVENT_COUNT"` | Yes | 이벤트 발생 횟수 집계 |
| `filters` | `Array<object>` | Yes | Phase 1-1에서는 빈 배열만 사용 |
| `groupBy` | `Array<string>` | Yes | Phase 1-1에서는 빈 배열만 사용 |

기간 조건은 `querySpec`에 저장하지 않는다. 실행 시점의 `periodType`, `periodKey`, `periodStart`, `periodEnd`가 조회 함수에 별도로 전달된다.

### MetricDefinition.warningRule

`warningRule`은 이전 기간 대비 이상 변화 판별 조건이다. 조건은 최소 표본 조건을 통과한 뒤 변화율 조건과 절대 변화량 조건을 AND로 평가한다.

```json
{
  "version": 1,
  "enabled": true,
  "comparison": "PREVIOUS_PERIOD",
  "trigger": "DECREASE",
  "changeRateThreshold": -0.2,
  "absoluteDeltaThreshold": -10,
  "severity": "WARNING"
}
```

필드 규칙:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | `1` | Yes | warningRule 형식 버전 |
| `enabled` | `boolean` | Yes | 경고 규칙 활성 여부 |
| `comparison` | `"PREVIOUS_PERIOD"` | Yes | 현재 기간과 직전 동형 기간 비교 |
| `trigger` | `"DECREASE"` \| `"INCREASE"` | Yes | 경고 방향 |
| `changeRateThreshold` | `number` | Yes | `(current - previous) / previous` 기준 임계치 |
| `absoluteDeltaThreshold` | `number` | Yes | `current - previous` 기준 임계치 |
| `severity` | `"INFO"` \| `"WARNING"` \| `"CRITICAL"` | Yes | 향후 alerts 테이블 확장 시 사용할 심각도 |

예시의 `absoluteDeltaThreshold: -10`은 "현재 값이 이전 값보다 10 이상 감소"를 뜻한다. 양수/음수 부호를 반드시 포함해 감소/증가 방향을 모호하지 않게 표현한다.

### MetricSnapshot 기간 형식

| Field | Format | Example | Notes |
|-------|--------|---------|-------|
| `periodType` | enum | `WEEKLY` | `WEEKLY` 또는 `MONTHLY` |
| `periodKey` | string | `2026-W17`, `2026-04` | KST 기준 기간 식별자 |
| `periodStart` | UTC DateTime | `2026-04-19T15:00:00.000Z` | KST 월요일 00:00 |
| `periodEnd` | UTC DateTime | `2026-04-26T15:00:00.000Z` | 다음 KST 월요일 00:00, exclusive |

세그먼트가 없는 전체 값은 `segmentKey = "ALL"`, `segmentValue = "ALL"`로 저장한다. nullable 세그먼트 필드는 PostgreSQL unique 제약에서 중복을 막지 못하므로 사용하지 않는다.

### MetricSnapshot value / sampleSize

| Field | Type | Rule |
|-------|------|------|
| `value` | `Decimal(20, 6)` | 리포트 계산의 기준 수치. count/rate 모두 저장 가능 |
| `sampleSize` | `Int` | 신뢰도 판별에 사용할 표본 수 또는 분모 |
| `querySpecVersion` | `Int` | 수집 당시 사용한 MetricDefinition.querySpecVersion |
| `unit` | `MetricUnit` | `value` 해석 단위는 MetricDefinition.unit을 따른다 |

`timer_started`처럼 count 지표인 경우 `value`는 이벤트 발생 횟수이고 `sampleSize`도 같은 이벤트 발생 횟수로 저장한다. 전환율 지표는 `value`에 비율 또는 퍼센트를 저장하고 `sampleSize`에는 분모 이벤트 수를 저장한다.

### MetricSnapshot.rawRef

외부 API 응답을 재현하거나 추적하기 위한 최소 참조만 저장한다. 원본 전체 응답, API Key, Authorization header는 저장하지 않는다.

```json
{
  "version": 1,
  "source": "AMPLITUDE",
  "requestId": "optional-provider-request-id",
  "endpoint": "/api/2/events/segmentation",
  "responseChecksum": "sha256:..."
}
```

### ReportRun.idempotencyKey

멱등성 키는 같은 의미의 리포트를 식별한다.

```text
{runType}:{targetPeriodKey}:v{reportVersion}
```

예시:

```text
WEEKLY_REPORT:2026-W17:v1
MONTHLY_REPORT:2026-04:v1
```

`report_runs`는 `idempotencyKey` 단일 unique와 `(runType, targetPeriodKey, reportVersion)` 복합 unique를 모두 둔다. 전자는 전송 중복 방지에 바로 쓰고, 후자는 사람이 SQL로 조사할 때 의미 단위 중복을 확인하기 쉽다.

### Delivery.responseRef

Discord 응답 추적에 필요한 비민감 참조만 저장한다.

```json
{
  "version": 1,
  "provider": "DISCORD",
  "statusCode": 204,
  "messageId": null
}
```

`channelTarget`에는 Webhook URL이 아니라 `DISCORD_WEBHOOK_URL_TEST` 같은 환경변수 키 또는 논리 채널 식별자만 저장한다.

---

## 초기 Seed 데이터

```typescript
// prisma/seed.ts
{
  key: 'timer_started',
  name: '토론 타이머 시작 횟수',
  description: 'Amplitude timer_started 이벤트 발생 횟수',
  source: 'AMPLITUDE',
  unit: 'COUNT',
  querySpecVersion: 1,
  querySpec: {
    version: 1,
    source: 'AMPLITUDE',
    kind: 'EVENT_COUNT',
    eventType: 'timer_started',
    aggregation: 'EVENT_COUNT',
    filters: [],
    groupBy: [],
  },
  direction: 'HIGHER_IS_BETTER',
  minSampleSize: 30,
  warningRule: {
    version: 1,
    enabled: true,
    comparison: 'PREVIOUS_PERIOD',
    trigger: 'DECREASE',
    changeRateThreshold: -0.2,
    absoluteDeltaThreshold: -10,
    severity: 'WARNING',
  },
  isActive: true,
}
```

Seed는 `upsert({ where: { key: 'timer_started' }, update: {}, create: ... })`로 작성해 반복 실행 시 기존 레코드를 유지한다.

---

## 타임존 고려사항

- `periodStart`, `periodEnd`, `collectedAt`, `createdAt`, `updatedAt` 등 모든 `DateTime`은 UTC로 저장한다.
- 기간 키(`periodKey`)와 기간 경계 계산은 Asia/Seoul 기준이다.
- 주간 경계는 KST 월요일 00:00부터 다음 KST 월요일 00:00 미만이다.
- 월간 경계는 KST 매월 1일 00:00부터 다음 달 1일 00:00 미만이다.
- Prisma `DateTime`은 JavaScript `Date`로 전달되므로, 서버 시스템 타임존에 의존하지 않고 명시적으로 KST 경계를 UTC로 변환해야 한다.
