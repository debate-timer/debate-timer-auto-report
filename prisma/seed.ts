import { PrismaPg } from '@prisma/adapter-pg';
import {
  Direction,
  MetricSource,
  MetricUnit,
  PrismaClient,
} from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to run Prisma seed');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  await prisma.metricDefinition.upsert({
    where: { key: 'timer_started' },
    update: {},
    create: {
      key: 'timer_started',
      name: '토론 타이머 시작 횟수',
      description: 'Amplitude timer_started 이벤트 발생 횟수',
      source: MetricSource.AMPLITUDE,
      unit: MetricUnit.COUNT,
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
      direction: Direction.HIGHER_IS_BETTER,
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
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
