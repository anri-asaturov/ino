import z from 'zod';

function castToIntegerOrUndefined(value: unknown) {
  return value === undefined ? undefined : parseInt(String(value));
}

const NODE_ENV = process.env.NODE_ENV;
export const isLocalDevServer = NODE_ENV === 'development';
export const isDeployedServer = NODE_ENV === 'production';
export const isTestServer = NODE_ENV === 'test';

export const MAX_IMPORT_PATIENTS = 200;

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  INO_ENV: z.enum(['development', 'production', 'local']),
  DATABASE_URL: z.string().startsWith('postgresql://'),
  PORT: z.string().optional().transform(castToIntegerOrUndefined),
  REQUEST_LOG_SLOW_MS: z.coerce.number().min(0).optional(),
  FRONTEND_URL: z.string().min(1),
  LOG_LEVEL: z.string().optional(),
  LAB_RESULTS_INITIAL_PATIENTS: z.coerce.number().int().min(1).max(MAX_IMPORT_PATIENTS).default(10)
});

const env = envSchema.parse(process.env);

export default env;

export const CORS_ORIGINS = env.INO_ENV === 'production' ? [env.FRONTEND_URL] : true;
/** Patients imported on first load; also the default batch size for `addNewData`. */
export const LAB_RESULTS_INITIAL_PATIENTS = env.LAB_RESULTS_INITIAL_PATIENTS;
export const LAB_RESULTS_IMPORT_CONCURRENCY = 3;
export const MOCK_API_LAB_RESULTS_URL = 'https://mockapi-furw4tenlq-ez.a.run.app/data';
