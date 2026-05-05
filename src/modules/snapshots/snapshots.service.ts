import { Injectable } from '@nestjs/common';
import type { MetricSnapshot } from '../../generated/prisma/client';
import { MetricCollectionResult } from '../metric-sources/core/metric-collection.types';
import { SnapshotsRepository } from './snapshots.repository';

/** 수집 성공 결과가 DB 스냅샷으로 저장되었을 때의 반환 타입입니다. */
export type SaveCollectionResultSaved = {
  /** 저장이 수행되었음을 나타내는 상태값입니다. */
  status: 'saved';
  /** Prisma가 반환한 MetricSnapshot 레코드입니다. */
  snapshot: MetricSnapshot;
};

/** 수집 결과가 저장 대상이 아니라 건너뛰었을 때의 반환 타입입니다. */
export type SaveCollectionResultSkipped = {
  /** 저장을 건너뛰었음을 나타내는 상태값입니다. */
  status: 'skipped';
  /** 저장을 건너뛴 이유입니다. */
  reason: 'COLLECTION_FAILED';
};

/** 수집 결과 저장 요청 후 service가 호출자에게 돌려주는 결과 타입입니다. */
export type SaveCollectionResultOutcome =
  | SaveCollectionResultSaved
  | SaveCollectionResultSkipped;

/** 수집 결과를 스냅샷 저장 정책에 맞게 처리하는 service입니다. */
@Injectable()
export class SnapshotsService {
  constructor(private readonly snapshotsRepository: SnapshotsRepository) {}

  /** 성공 수집 결과를 저장하고 저장 결과를 호출자에게 반환합니다. */
  async saveCollectionResult(
    result: MetricCollectionResult,
  ): Promise<SaveCollectionResultOutcome> {
    if (result.status !== 'success') {
      return { status: 'skipped', reason: 'COLLECTION_FAILED' };
    }

    const snapshot =
      await this.snapshotsRepository.upsertCollectionSuccess(result);

    return { status: 'saved', snapshot };
  }
}
