import { execSync } from 'node:child_process';

/** Bring the test database schema up to date once before the integration suite. */
export default function setup() {
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
    stdio: 'ignore',
  });
}
