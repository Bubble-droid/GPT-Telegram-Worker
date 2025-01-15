// src/env.ts
export interface Env {
  TELEGRAM_BOT_TOKEN: string;
  WHITELISTED_USERS: string;
  SYSTEM_INIT_MESSAGE: string;
  SYSTEM_INIT_MESSAGE_ROLE: string;
  DEFAULT_MODEL?: string;
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
  GOOGLE_MODEL_KEY: string;
  GOOGLE_MODEL_BASEURL?: string;
  GOOGLE_MODELS: string;
  TRAINING_DATA_URL: string;
  COOLDOWN: KVNamespace;
  // 新增bot名称和冷却间隔环境变量
  BOT_NAME: string;
  GROUP_COOLDOWN_INTERVAL: string;
}

const getEnvOrDefault = (env: Env, key: keyof Env, defaultValue: string): string => {
  return (env[key] as string) || defaultValue;
};

export const getConfig = (env: Env) => {
  const hasGoogle = !!env.GOOGLE_MODEL_KEY;
  if (!hasGoogle) {
    throw new Error('At least one model API key must be set (Google)');
  }

  return {
    telegramBotToken: env.TELEGRAM_BOT_TOKEN,
    whitelistedUsers: env.WHITELISTED_USERS ? env.WHITELISTED_USERS.split(',').map(id => id.trim()) : [],
    systemInitMessage: getEnvOrDefault(env, 'SYSTEM_INIT_MESSAGE', 'You are a helpful assistant.'), // 从环境变量读取，设置默认值
    systemInitMessageRole: getEnvOrDefault(env, 'SYSTEM_INIT_MESSAGE_ROLE', 'system'),
    defaultModel: env.DEFAULT_MODEL,
      upstashRedisRestUrl: env.UPSTASH_REDIS_REST_URL,
      upstashRedisRestToken: env.UPSTASH_REDIS_REST_TOKEN,
      languageTTL: 60 * 60 * 24 * 365,
      contextTTL: 60 * 60 * 24 * 30,
      googleModelKey: env.GOOGLE_MODEL_KEY,
      googleModelBaseUrl: getEnvOrDefault(env, 'GOOGLE_MODEL_BASEURL', 'https://generativelanguage.googleapis.com/v1beta'),
      googleModels: env.GOOGLE_MODELS ? env.GOOGLE_MODELS.split(',').map(model => model.trim()) : [],
      // 从环境变量中获取bot名称和冷却间隔
      botName: getEnvOrDefault(env, 'BOT_NAME', 'bot'),
      groupCooldownInterval: parseInt(getEnvOrDefault(env, 'GROUP_COOLDOWN_INTERVAL', '180000'), 10),
  };
};
