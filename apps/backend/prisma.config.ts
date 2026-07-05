import { config } from '@dotenvx/dotenvx';
import { defineConfig, env } from 'prisma/config';

config({ ignore: ['MISSING_ENV_FILE'] });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations'
  },
  datasource: {
    url: env('DATABASE_URL')
  }
});
