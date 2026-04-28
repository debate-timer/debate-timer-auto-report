import { Module } from '@nestjs/common';
import { AMPLITUDE_FETCH, AmplitudeClient } from './amplitude/amplitude.client';
import { AmplitudeMetricSourceAdapter } from './amplitude/amplitude-metric-source.adapter';
import { METRIC_SOURCE_ADAPTER } from './core/metric-source.tokens';

@Module({
  providers: [
    {
      provide: AMPLITUDE_FETCH,
      useValue: fetch,
    },
    AmplitudeClient,
    AmplitudeMetricSourceAdapter,
    {
      provide: METRIC_SOURCE_ADAPTER,
      useExisting: AmplitudeMetricSourceAdapter,
    },
  ],
  exports: [METRIC_SOURCE_ADAPTER],
})
export class MetricSourcesModule {}
