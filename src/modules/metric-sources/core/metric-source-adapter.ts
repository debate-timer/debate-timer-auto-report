import { MetricDefinition } from '../../../generated/prisma/client';
import {
  MetricCollectionPeriod,
  MetricCollectionResult,
} from './metric-collection.types';

/** 외부 지표 원천에서 값을 수집하는 어댑터가 지켜야 하는 공통 계약입니다. */
export interface MetricSourceAdapter {
  /** 지표 정의와 대상 기간을 받아 성공 또는 실패 수집 결과를 반환합니다. */
  collect(
    definition: MetricDefinition,
    period: MetricCollectionPeriod,
  ): Promise<MetricCollectionResult>;
}
