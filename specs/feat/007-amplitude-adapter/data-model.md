# Data Model: Phase 1-2 Amplitude Adapter 구현

**Branch**: `feat/#7` | **Date**: 2026-04-27  
**Spec**: [spec.md](./spec.md)

## Scope

Phase 1-2 does not add Prisma tables or migrations. It defines TypeScript contracts that map existing `MetricDefinition` rows to existing `MetricSnapshot` rows.

Existing persistent entities:

- `MetricDefinition`: source metric configuration seeded with `timer_started`.
- `MetricSnapshot`: persisted period value for one metric, one period, one segment.

## TypeScript Data Shapes

### MetricCollectionPeriod

```typescript
export type SupportedCollectionPeriodType = 'WEEKLY';

export type MetricCollectionPeriod = {
  periodType: 'WEEKLY' | 'MONTHLY';
  periodKey: string;
  periodStart: Date;
  periodEnd: Date;
};
```

Rules:

- Phase 1-2 accepts only `periodType: 'WEEKLY'`.
- `MONTHLY` remains in the type so Phase 1-3 can add support without changing the caller contract.
- `periodStart` and `periodEnd` use UTC `Date` values representing KST period boundaries.
- `periodEnd` is exclusive, matching Phase 1-1 data model rules.

### MetricCollectionResult

```typescript
export type MetricCollectionSuccess = {
  status: 'success';
  metricDefinitionId: string;
  metricKey: string;
  source: 'AMPLITUDE';
  periodType: 'WEEKLY' | 'MONTHLY';
  periodKey: string;
  periodStart: Date;
  periodEnd: Date;
  segmentKey: 'ALL';
  segmentValue: 'ALL';
  value: number;
  sampleSize: number;
  querySpecVersion: number;
  rawRef: MetricSnapshotRawRef;
};

export type MetricCollectionFailureCode =
  | 'UNSUPPORTED_PERIOD_TYPE'
  | 'UNSUPPORTED_QUERY_SPEC'
  | 'AMPLITUDE_API_ERROR'
  | 'AMPLITUDE_RESPONSE_INVALID';

export type MetricCollectionFailure = {
  status: 'failed';
  metricDefinitionId: string;
  metricKey: string;
  source: 'AMPLITUDE';
  periodType: 'WEEKLY' | 'MONTHLY';
  periodKey: string;
  reasonCode: MetricCollectionFailureCode;
  message: string;
};

export type MetricCollectionResult =
  | MetricCollectionSuccess
  | MetricCollectionFailure;
```

Rules:

- Success results are the only results eligible for snapshot persistence.
- Failure results never contain API keys, secret keys, Authorization headers, full response bodies, or stack traces.
- Count metrics store `sampleSize` equal to `value`.

### MetricSnapshotRawRef

```typescript
export type MetricSnapshotRawRef = {
  version: 1;
  source: 'AMPLITUDE';
  endpoint: '/api/2/events/segmentation';
  requestId?: string;
  responseChecksum: `sha256:${string}`;
};
```

Rules:

- `responseChecksum` is a SHA-256 digest of the raw successful response text read from Amplitude.
- `requestId` is optional because Amplitude may not always return a request id header.
- `rawRef` must not include credentials, Authorization headers, or raw response payload.
- The repository checks `rawRef` keys recursively before persistence and rejects common credential-key variants such as `api_key`, `accessToken`, `refresh-token`, `password`, `secret`, and `Authorization`.

### AmplitudeEventCountQuerySpec

```typescript
export type AmplitudeEventCountQuerySpec = {
  version: 1;
  source: 'AMPLITUDE';
  kind: 'EVENT_COUNT';
  eventType: 'timer_started';
  aggregation: 'EVENT_COUNT';
  filters: [];
  groupBy: [];
};
```

Rules:

- Phase 1-2 supports only this exact shape.
- Unsupported `source`, `kind`, `eventType`, `aggregation`, non-empty `filters`, non-empty `groupBy`, or extra keys produce `UNSUPPORTED_QUERY_SPEC`.

### AmplitudeSegmentationResponse

```typescript
export type AmplitudeSegmentationResponse = {
  data?: {
    series?: number[][];
    seriesLabels?: string[];
    seriesCollapsed?: Array<Array<{ value?: number }>>;
    xValues?: string[];
  };
};
```

Rules:

- Normal success value comes from `data.seriesCollapsed[0][0].value`.
- If the HTTP request succeeds but `data.seriesCollapsed` is empty, the collected value is `0`.
- If `seriesCollapsed` or its first nested series has the wrong structure, return `AMPLITUDE_RESPONSE_INVALID`.
- If `value` exists but is not a finite number, return `AMPLITUDE_RESPONSE_INVALID`.

## Snapshot Persistence Mapping

| Collection Field     | MetricSnapshot Field | Rule                                          |
| -------------------- | -------------------- | --------------------------------------------- |
| `metricDefinitionId` | `metricDefinitionId` | Existing definition id                        |
| `source`             | `source`             | Always `AMPLITUDE`                            |
| `periodType`         | `periodType`         | `WEEKLY` only in Phase 1-2                    |
| `periodKey`          | `periodKey`          | Caller-provided KST key, e.g. `2026-W17`      |
| `periodStart`        | `periodStart`        | UTC DateTime                                  |
| `periodEnd`          | `periodEnd`          | UTC DateTime, exclusive                       |
| `segmentKey`         | `segmentKey`         | Always `ALL`                                  |
| `segmentValue`       | `segmentValue`       | Always `ALL`                                  |
| `value`              | `value`              | Decimal-compatible count value                |
| `sampleSize`         | `sampleSize`         | Same number as `value` for count metrics      |
| `querySpecVersion`   | `querySpecVersion`   | Copy from `MetricDefinition.querySpecVersion` |
| `rawRef`             | `rawRef`             | Sanitized `MetricSnapshotRawRef`              |

## Identity and Uniqueness

`MetricSnapshot` identity remains the existing compound unique key:

```text
metricDefinitionId + periodType + periodKey + segmentKey + segmentValue
```

Duplicate persistence uses no-op `upsert`:

- `create`: insert the new successful snapshot.
- `update`: `{}` to preserve the existing row.

## Lifecycle

```text
MetricDefinition(timer_started)
  -> MetricSourceAdapter.collect(definition, weeklyPeriod)
  -> MetricCollectionSuccess or MetricCollectionFailure
  -> SnapshotsService.saveCollectionResult(result)
  -> MetricSnapshot row only when result.status === 'success'
```

Failure results stop before persistence and are returned to the caller for Phase 1-3 run handling.
