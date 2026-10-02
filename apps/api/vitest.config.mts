import { defineConfig } from 'vitest/config';

// Integration tests run against a dedicated database (created by docker/init.sql),
// never against dev/demo data.
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://salary:salary@localhost:5440/salary_test';
process.env.TEST_DATABASE_URL = TEST_DATABASE_URL;

export default defineConfig({
  test: {
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: TEST_DATABASE_URL,
      // Test-only credentials (see src/test/auth.ts). Low bcrypt cost keeps tests fast.
      ADMIN_EMAIL: 'hr@acme.example',
      ADMIN_PASSWORD_HASH: '$2b$04$zms08Fvwmx4xlaXOljYpf.23mV9DBDt32g6/q0LJI4I8mI0xY.3mu',
      JWT_SECRET: 'test-only-secret-that-is-at-least-32-chars',
    },
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
