# Contract: Metric Source Adapter

**Source files**:

- `src/modules/metric-sources/core/metric-source-adapter.ts`
- `src/modules/metric-sources/core/metric-collection.types.ts`
- `src/modules/metric-sources/core/metric-source.tokens.ts`
- `src/modules/metric-sources/amplitude/amplitude-metric-source.adapter.ts`

## Interface

```typescript
import { MetricDefinition } from '../../../generated/prisma/client';
import {
  MetricCollectionPeriod,
  MetricCollectionResult,
} from './metric-collection.types';

export interface MetricSourceAdapter {
  collect(
    definition: MetricDefinition,
    period: MetricCollectionPeriod,
  ): Promise<MetricCollectionResult>;
}
```

## Dependency Injection Token

```typescript
export const METRIC_SOURCE_ADAPTER = Symbol('METRIC_SOURCE_ADAPTER');
```

## Input Rules

- `definition.source` must be `AMPLITUDE`.
- `definition.key` must be `timer_started` for Phase 1-2.
- `definition.querySpec` must match the Phase 1-2 `AmplitudeEventCountQuerySpec`.
- `period.periodType` must be `WEEKLY`.
- `period.periodStart` and `period.periodEnd` must represent the existing KST weekly boundary as UTC `Date` values.

## Success Output Rules

The adapter returns `MetricCollectionSuccess` when:

- the period type is supported,
- the query spec is supported,
- Amplitude returns a successful HTTP response,
- the response contains a valid total or an empty successful result.

Success output always uses:

- `source: 'AMPLITUDE'`
- `segmentKey: 'ALL'`
- `segmentValue: 'ALL'`
- `sampleSize === value`
- sanitized `rawRef`

## Failure Output Rules

The adapter returns `MetricCollectionFailure` when:

- `period.periodType` is `MONTHLY`: `UNSUPPORTED_PERIOD_TYPE`
- query spec shape is unsupported: `UNSUPPORTED_QUERY_SPEC`
- Amplitude returns non-2xx or fetch throws: `AMPLITUDE_API_ERROR`
- Amplitude response is malformed: `AMPLITUDE_RESPONSE_INVALID`

Failure output must include `metricDefinitionId`, `metricKey`, `periodType`, `periodKey`, `reasonCode`, and a short safe message.

Failure output must not contain credentials, Authorization headers, raw response bodies, or stack traces.
