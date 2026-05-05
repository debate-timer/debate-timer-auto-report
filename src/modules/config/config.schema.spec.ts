import { configSchema } from './config.schema';

describe('ConfigSchema', () => {
  type ConfigValues = {
    LOG_LEVEL?: string;
    NODE_ENV?: string;
    PORT?: number;
  };

  const validEnv = {
    NODE_ENV: 'development',
    TZ: 'Asia/Seoul',
    PORT: '3000',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/debate_timer',
    AMPLITUDE_API_KEY: 'amplitude-api-key',
    AMPLITUDE_SECRET_KEY: 'amplitude-secret-key',
    DISCORD_WEBHOOK_URL_TEST:
      'https://discord.com/api/webhooks/123456789/token',
    SCHEDULE_WEEKLY_REPORT: '0 9 * * 1',
    SCHEDULE_MONTHLY_REPORT: '0 9 1 * *',
    LOG_LEVEL: 'info',
  };

  function validate(overrides: Record<string, string | undefined> = {}) {
    const env = { ...validEnv, ...overrides };

    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) {
        delete env[key as keyof typeof env];
      }
    }

    return configSchema.validate(env, {
      abortEarly: false,
      allowUnknown: true,
    });
  }

  describe('필수 환경변수 존재 검증', () => {
    test('모든 필수 환경변수가 있을 때 검증에 성공한다', () => {
      const { error } = validate();

      expect(error).toBeUndefined();
    });

    test.each([
      'DATABASE_URL',
      'AMPLITUDE_API_KEY',
      'AMPLITUDE_SECRET_KEY',
      'DISCORD_WEBHOOK_URL_TEST',
      'SCHEDULE_WEEKLY_REPORT',
      'SCHEDULE_MONTHLY_REPORT',
    ])('%s가 없으면 검증에 실패한다', (key) => {
      const { error } = validate({ [key]: undefined });

      expect(error).toBeDefined();
      expect(error?.message).toContain(key);
    });
  });

  describe('LOG_LEVEL 환경변수 검증', () => {
    test('LOG_LEVEL을 지정하지 않으면 기본값 info가 적용된다', () => {
      const result = validate({ LOG_LEVEL: undefined });
      const value = result.value as ConfigValues;

      expect(result.error).toBeUndefined();
      expect(value.LOG_LEVEL).toBe('info');
    });

    test.each(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])(
      '허용된 LOG_LEVEL 값 %s는 검증에 성공한다',
      (logLevel) => {
        const { error } = validate({ LOG_LEVEL: logLevel });

        expect(error).toBeUndefined();
      },
    );

    test('허용되지 않은 LOG_LEVEL 값이면 검증에 실패한다', () => {
      const { error } = validate({ LOG_LEVEL: 'verbose' });

      expect(error).toBeDefined();
      expect(error?.message).toContain('LOG_LEVEL');
    });
  });

  describe('애플리케이션 기본 환경변수 검증', () => {
    test('TZ가 Asia/Seoul이면 검증에 성공한다', () => {
      const { error } = validate({ TZ: 'Asia/Seoul' });

      expect(error).toBeUndefined();
    });

    test('TZ가 없으면 검증에 실패한다', () => {
      const { error } = validate({ TZ: undefined });

      expect(error).toBeDefined();
      expect(error?.message).toContain('TZ');
    });

    test('TZ가 Asia/Seoul이 아니면 검증에 실패한다', () => {
      const { error } = validate({ TZ: 'UTC' });

      expect(error).toBeDefined();
      expect(error?.message).toContain('TZ');
    });

    test('NODE_ENV를 지정하지 않으면 기본값 development가 적용된다', () => {
      const result = validate({ NODE_ENV: undefined });
      const value = result.value as ConfigValues;

      expect(result.error).toBeUndefined();
      expect(value.NODE_ENV).toBe('development');
    });

    test.each(['development', 'test', 'production'])(
      '허용된 NODE_ENV 값 %s는 검증에 성공한다',
      (nodeEnv) => {
        const { error } = validate({ NODE_ENV: nodeEnv });

        expect(error).toBeUndefined();
      },
    );

    test('PORT를 지정하지 않으면 기본값 3000이 적용된다', () => {
      const result = validate({ PORT: undefined });
      const value = result.value as ConfigValues;

      expect(result.error).toBeUndefined();
      expect(value.PORT).toBe(3000);
    });

    test('PORT가 숫자 포트 형식이 아니면 검증에 실패한다', () => {
      const { error } = validate({ PORT: 'not-a-number' });

      expect(error).toBeDefined();
      expect(error?.message).toContain('PORT');
    });
  });

  describe('DATABASE_URL 형식 검증', () => {
    test('URL 형식이 아니면 검증에 실패한다', () => {
      const { error } = validate({ DATABASE_URL: 'not-a-url' });

      expect(error).toBeDefined();
      expect(error?.message).toContain('DATABASE_URL');
    });

    test('PostgreSQL이 아닌 URI scheme이면 검증에 실패한다', () => {
      const { error } = validate({
        DATABASE_URL: 'mysql://user:pass@localhost:3306/db',
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('DATABASE_URL');
    });
  });
});
