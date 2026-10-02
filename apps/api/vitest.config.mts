import { defineConfig } from 'vitest/config';

// Integration tests run against a dedicated database (created by docker/init.sql),
// never against dev/demo data.
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://salary:salary@localhost:5440/salary_test';
process.env.TEST_DATABASE_URL = TEST_DATABASE_URL;

export default defineConfig({
  test: {
    env: { NODE_ENV: 'test', DATABASE_URL: TEST_DATABASE_URL },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts'],
          exclude: ['src/**/*.int.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['src/**/*.int.test.ts'],
          globalSetup: ['./src/test/global-setup.ts'],
          setupFiles: ['./src/test/setup.ts'],
          // Files share one database, so run them one at a time.
          maxWorkers: 1,
        },
      },
    ],
  },
});
