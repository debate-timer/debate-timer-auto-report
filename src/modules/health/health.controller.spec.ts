import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('GET /health', () => {
    test('서비스가 정상 동작 중일 때 상태 ok를 반환한다', () => {
      expect(controller.check()).toEqual({ status: 'ok' });
    });

    test('반복 요청에도 일관된 응답을 반환한다', () => {
      expect(controller.check()).toEqual({ status: 'ok' });
      expect(controller.check()).toEqual({ status: 'ok' });
      expect(controller.check()).toEqual({ status: 'ok' });
    });
  });
});
