/** Phase 1-2에서 허용하는 Amplitude 이벤트 카운트 querySpec 구조입니다. */
export type AmplitudeEventCountQuerySpec = {
  /** querySpec 구조 버전입니다. */
  version: 1;
  /** 지표 원천입니다. 이 파서는 AMPLITUDE만 허용합니다. */
  source: 'AMPLITUDE';
  /** 조회 종류입니다. Phase 1-2에서는 이벤트 카운트만 허용합니다. */
  kind: 'EVENT_COUNT';
  /** 조회할 Amplitude 이벤트 타입입니다. */
  eventType: 'timer_started';
  /** 집계 방식입니다. Phase 1-2에서는 이벤트 발생 횟수만 허용합니다. */
  aggregation: 'EVENT_COUNT';
  /** 이벤트 필터 목록입니다. Phase 1-2에서는 필터 없는 전체 집계만 허용합니다. */
  filters: [];
  /** 그룹핑 기준입니다. Phase 1-2에서는 그룹핑 없는 전체 세그먼트만 허용합니다. */
  groupBy: [];
};

/** 검증된 querySpec에서 어댑터가 실제 호출에 필요한 값만 추린 타입입니다. */
export type ParsedAmplitudeEventCountQuerySpec = {
  /** Amplitude Event Segmentation API에 전달할 이벤트 타입입니다. */
  eventType: 'timer_started';
};

export function parseAmplitudeEventCountQuerySpec(
  querySpec: unknown,
): ParsedAmplitudeEventCountQuerySpec {
  // querySpec은 DB의 JSON 필드에서 오므로 런타임에는 unknown입니다.
  // 먼저 plain object인지 확인한 뒤, Phase 1-2가 허용한 정확한 모양만 통과시킵니다.
  if (!isRecord(querySpec)) {
    throw new Error('Unsupported Amplitude querySpec');
  }

  const allowedKeys = new Set([
    'version',
    'source',
    'kind',
    'eventType',
    'aggregation',
    'filters',
    'groupBy',
  ]);
  const querySpecKeys = Object.keys(querySpec);
  const isSupported =
    querySpecKeys.length === allowedKeys.size &&
    querySpecKeys.every((key) => allowedKeys.has(key)) &&
    querySpec.version === 1 &&
    querySpec.source === 'AMPLITUDE' &&
    querySpec.kind === 'EVENT_COUNT' &&
    querySpec.eventType === 'timer_started' &&
    querySpec.aggregation === 'EVENT_COUNT' &&
    Array.isArray(querySpec.filters) &&
    querySpec.filters.length === 0 &&
    Array.isArray(querySpec.groupBy) &&
    querySpec.groupBy.length === 0;

  if (!isSupported) {
    throw new Error('Unsupported Amplitude querySpec');
  }

  return { eventType: 'timer_started' };
}

/** unknown 값이 key-value object인지 확인해 이후 속성 접근을 안전하게 만듭니다. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
