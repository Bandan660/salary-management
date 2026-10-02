import type { Express } from 'express';
import request from 'supertest';

/** Matches the test env in vitest.config.mts. */
export const TEST_CREDENTIALS = { email: 'hr@acme.example', password: 'test-password-123' };

/** A supertest agent that is signed in (keeps the session cookie between requests). */
export async function signedInAgent(app: Express) {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send(TEST_CREDENTIALS).expect(200);
  return agent;
}
