/** 지표를 수집할 대상 기간을 표현하는 공통 입력 타입입니다. */
export type MetricCollectionPeriod = {
  /** 수집 기간 단위입니다. Phase 1-2에서는 WEEKLY만 실제로 지원합니다. */
  periodType: 'WEEKLY' | 'MONTHLY';
  /** 사람이 읽고 중복 저장 키로도 쓰는 기간 식별자입니다. 예: 2026-W17 */
  periodKey: string;
  /** 기간 시작 시각입니다. DB에는 UTC DateTime으로 저장합니다. */
  periodStart: Date;
  /** 기간 종료 시각입니다. 이 시각은 포함하지 않는 exclusive end입니다. */
  periodEnd: Date;
};

/** 원천 API 응답을 추적하기 위한 안전한 참조 정보입니다. */
export type MetricSnapshotRawRef = {
  /** rawRef 구조 버전입니다. 구조가 바뀌면 숫자를 올립니다. */
  version: 1;
  /** 값을 가져온 외부 지표 원천입니다. */
  source: 'AMPLITUDE';
  /** 호출한 Amplitude API endpoint 경로입니다. host와 credential은 저장하지 않습니다. */
  endpoint: '/api/2/events/segmentation';
  /** Amplitude가 응답 헤더로 제공할 수 있는 요청 추적 ID입니다. */
  requestId?: string;
  /** 민감정보를 제외한 응답 본문의 SHA-256 checksum입니다. */
  responseChecksum: `sha256:${string}`;
};

/** 외부 지표 수집이 성공했을 때 스냅샷 저장까지 전달되는 표준 결과입니다. */
export type MetricCollectionSuccess = {
  /** 성공/실패를 구분하는 판별 필드입니다. */
  status: 'success';
  /** DB의 MetricDefinition id입니다. 스냅샷 unique key의 일부입니다. */
  metricDefinitionId: string;
  /** 지표의 사람이 읽는 key입니다. 예: timer_started */
  metricKey: string;
  /** 지표 원천입니다. Phase 1-2에서는 AMPLITUDE만 사용합니다. */
  source: 'AMPLITUDE';
  /** 수집 기간 단위입니다. 결과 계약은 MONTHLY 확장을 위해 값을 보존합니다. */
  periodType: 'WEEKLY' | 'MONTHLY';
  /** 기간 식별자입니다. 예: 2026-W17 */
  periodKey: string;
  /** 수집 기간 시작 시각입니다. */
  periodStart: Date;
  /** 수집 기간 종료 시각입니다. exclusive end입니다. */
  periodEnd: Date;
  /** 세그먼트 종류입니다. Phase 1-2에서는 전체 세그먼트만 사용합니다. */
  segmentKey: 'ALL';
  /** 세그먼트 값입니다. Phase 1-2에서는 전체 세그먼트만 사용합니다. */
  segmentValue: 'ALL';
  /** 수집된 지표 값입니다. timer_started에서는 이벤트 발생 횟수입니다. */
  value: number;
  /** 표본 수입니다. count 지표인 timer_started에서는 value와 같습니다. */
  sampleSize: number;
  /** MetricDefinition.querySpecVersion을 복사한 값입니다. */
  querySpecVersion: number;
  /** 원천 응답을 추적하기 위한 안전한 참조 정보입니다. */
  rawRef: MetricSnapshotRawRef;
};

/** 지표 수집 실패 원인을 호출자가 기계적으로 구분하기 위한 코드입니다. */
export type MetricCollectionFailureCode =
  | 'UNSUPPORTED_PERIOD_TYPE'
  | 'UNSUPPORTED_QUERY_SPEC'
  | 'AMPLITUDE_API_ERROR'
  | 'AMPLITUDE_RESPONSE_INVALID';

/** 외부 지표 수집이 실패했을 때 스냅샷 저장 없이 반환되는 표준 결과입니다. */
export type MetricCollectionFailure = {
  /** 성공/실패를 구분하는 판별 필드입니다. */
  status: 'failed';
  /** 실패한 MetricDefinition id입니다. */
  metricDefinitionId: string;
  /** 실패한 지표 key입니다. 예: timer_started */
  metricKey: string;
  /** 실패가 발생한 지표 원천입니다. */
  source: 'AMPLITUDE';
  /** 실패가 발생한 수집 기간 단위입니다. */
  periodType: 'WEEKLY' | 'MONTHLY';
  /** 실패가 발생한 기간 식별자입니다. */
  periodKey: string;
  /** 실패 유형을 안전하게 분류한 코드입니다. */
  reasonCode: MetricCollectionFailureCode;
  /** credential이나 raw response를 포함하지 않는 짧은 실패 설명입니다. */
  message: string;
};

/** 지표 수집 호출자가 받는 최종 결과입니다. status로 성공과 실패를 구분합니다. */
export type MetricCollectionResult =
  | MetricCollectionSuccess
  | MetricCollectionFailure;
