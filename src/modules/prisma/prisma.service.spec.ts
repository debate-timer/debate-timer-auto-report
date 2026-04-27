import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import { PrismaService } from './prisma.service';

const mockConnect = jest.fn();
const mockDisconnect = jest.fn();

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest
    .fn()
    .mockImplementation((options: { connectionString: string }) => ({
      options,
    })),
}));

jest.mock('../../generated/prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(function (this: {
    $connect: jest.Mock;
    $disconnect: jest.Mock;
  }) {
    this.$connect = mockConnect;
    this.$disconnect = mockDisconnect;
  }),
}));

describe('PrismaService', () => {
  const connectionString = 'postgresql://user:pass@localhost:5432/db';
  let configService: Pick<ConfigService, 'getOrThrow'>;

  beforeEach(() => {
    jest.clearAllMocks();

    configService = {
      getOrThrow: jest.fn().mockReturnValue(connectionString),
    };
  });

  function createService() {
    return new PrismaService(configService as ConfigService);
  }

  describe('Prisma 7 adapter 생성', () => {
    test('ConfigService에서 DATABASE_URL을 읽어 PrismaPg adapter를 생성한다', () => {
      createService();

      expect(configService.getOrThrow).toHaveBeenCalledWith('DATABASE_URL');
      expect(PrismaPg).toHaveBeenCalledWith({ connectionString });
      expect(PrismaClient).toHaveBeenCalledWith({
        adapter: { options: { connectionString } },
      });
    });
  });

  describe('생명주기 훅', () => {
    test('onModuleInit 시 $connect가 호출된다', async () => {
      const service = createService();

      await service.onModuleInit();

      expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    test('onModuleDestroy 시 $disconnect가 호출된다', async () => {
      const service = createService();

      await service.onModuleDestroy();

      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('DB 연결 실패 처리', () => {
    test('$connect 실패 시 예외가 전파된다', async () => {
      const error = new Error('connection refused');
      mockConnect.mockRejectedValueOnce(error);
      const service = createService();

      await expect(service.onModuleInit()).rejects.toThrow(
        'connection refused',
      );
    });
  });
});
