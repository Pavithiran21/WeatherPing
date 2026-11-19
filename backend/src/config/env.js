const fs = require('node:fs');
const path = require('node:path');
const { z } = require('zod');

// The .env file sits in the backend folder (WeatherPing/backend/.env), two folders above src/config.
// ENV_FILE can point somewhere else (used by tests and demos).
// Variables that are already set are not overwritten.
const envFile = process.env.ENV_FILE ?? path.resolve(__dirname, '../../.env');
if (fs.existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const secret = z.string().min(32, 'must be at least 32 characters');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  MONGODB_URI: z.string().regex(/^mongodb(\+srv)?:\/\//, 'must be a mongodb:// or mongodb+srv:// URI'),

  JWT_SECRET: secret,
  UNSUBSCRIBE_SECRET: secret,
  JOB_TRIGGER_SECRET: secret,
  FRONTEND_URL: z.url(),

  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  SMTP_FROM: z.string().min(1),

  OPEN_METEO_FORECAST_URL: z.url(),
  OPEN_METEO_AIR_QUALITY_URL: z.url(),
  OPEN_METEO_GEOCODING_URL: z.url(),
  // How long one weather API call may take before it counts as failed.
  WEATHER_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),

  EVALUATOR_CRON: z.string().min(1).default('*/30 * * * *'),

  // Playwright runs log in many times from one IP, so they turn the limits off
  // (one last pass turns them back on to prove the 429s). Never allowed in production.
  RATE_LIMITS_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),

  DEMO_MODE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  DEMO_PASSWORD: z.string().min(8).optional(),

  // Emails to demo addresses (@demo.weatherping.test) go to this Ethereal inbox, never through
  // Brevo. Without these, every email uses the SMTP_* settings above (tests and old demos).
  DEMO_SMTP_HOST: z.string().min(1).optional(),
  DEMO_SMTP_PORT: z.coerce.number().int().positive().optional(),
  DEMO_SMTP_USER: z.string().min(1).optional(),
  DEMO_SMTP_PASS: z.string().min(1).optional(),
  DEMO_SMTP_FROM: z.string().min(1).optional(),

  // Hosting. TRUST_PROXY is Express's "trust proxy": "loopback" (default: the Vite proxy and the
  // Playwright run on this machine) or the number of proxies in front, e.g. 1 on Render, so the
  // rate limiters key on the visitor's IP and not the proxy's.
  TRUST_PROXY: z
    .string()
    .regex(/^(loopback|\d{1,2})$/, 'must be "loopback" or a number of proxy hops')
    .default('loopback')
    .transform((value) => (value === 'loopback' ? value : Number(value))),
  // A folder with the built frontend (frontend/dist). When set, the API also serves the app, so
  // one service is the whole site on one origin (the Docker image sets it).
  STATIC_DIR: z.string().min(1).optional(),
})
  .refine((values) => values.NODE_ENV !== 'production' || values.RATE_LIMITS_ENABLED, {
    message: 'cannot be false in production',
    path: ['RATE_LIMITS_ENABLED'],
  })
  .refine((values) => !values.DEMO_MODE || values.DEMO_PASSWORD, {
    message: 'is required when DEMO_MODE=true',
    path: ['DEMO_PASSWORD'],
  });

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  // Only variable names and rules are printed, never the values.
  throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
}

const env = parsed.data;

module.exports = { env };
