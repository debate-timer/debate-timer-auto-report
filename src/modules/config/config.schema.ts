import Joi from 'joi';

export const configSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  TZ: Joi.string().valid('Asia/Seoul').required(),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),
  AMPLITUDE_API_KEY: Joi.string().required(),
  AMPLITUDE_SECRET_KEY: Joi.string().required(),
  DISCORD_WEBHOOK_URL_TEST: Joi.string().uri().required(),
  DISCORD_WEBHOOK_URL_REPORT: Joi.string().uri().optional(),
  DISCORD_WEBHOOK_URL_ALERT: Joi.string().uri().optional(),
  DISCORD_WEBHOOK_URL_OPS: Joi.string().uri().optional(),
  SCHEDULE_WEEKLY_REPORT: Joi.string().required(),
  SCHEDULE_MONTHLY_REPORT: Joi.string().required(),
  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace')
    .default('info'),
  AI_ENABLED: Joi.boolean().default(false),
});
