import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

jest.mock('../src/modules/prisma/prisma.service', () => ({
  PrismaService: class {
    async onModuleInit(): Promise<void> {}
    async onModuleDestroy(): Promise<void> {}
  },
}));

describe('Health (e2e)', () => {
  let app: INestApplication | undefined;

  beforeEach(async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.AMPLITUDE_API_KEY = 'amplitude-api-key';
    process.env.AMPLITUDE_SECRET_KEY = 'amplitude-secret-key';
    process.env.DISCORD_WEBHOOK_URL_TEST =
      'https://discord.com/api/webhooks/123456789/token';
    process.env.SCHEDULE_WEEKLY_REPORT = '0 9 * * 1';
    process.env.SCHEDULE_MONTHLY_REPORT = '0 9 1 * *';
    process.env.LOG_LEVEL = 'fatal';

    const { AppModule } = jest.requireActual<
      typeof import('./../src/app.module')
    >('./../src/app.module');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

  test('GET /health는 200과 상태 ok를 반환한다', () => {
    if (!app) {
      throw new Error('Nest application was not initialized');
    }

    const server = app.getHttpServer() as Parameters<typeof request>[0];

    return request(server).get('/health').expect(200).expect({ status: 'ok' });
  });
});
