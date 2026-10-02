import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../app';
import { TEST_CREDENTIALS, signedInAgent } from '../../test/auth';

const app = createApp();

describe('auth', () => {
  it('logs in with valid credentials and sets an httpOnly session cookie', async () => {
    const res = await request(app).post('/api/auth/login').send(TEST_CREDENTIALS);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ email: 'hr@acme.example' });
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/^session=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it('accepts the email case-insensitively', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ ...TEST_CREDENTIALS, email: 'HR@Acme.Example' });

    expect(res.status).toBe(200);
  });

  it('gives the same error for a wrong password and a wrong email', async () => {
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ ...TEST_CREDENTIALS, password: 'nope' });
    const wrongEmail = await request(app)
      .post('/api/auth/login')
      .send({ ...TEST_CREDENTIALS, email: 'someone@acme.example' });

    expect(wrongPassword.status).toBe(401);
    expect(wrongEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(wrongEmail.body);
  });

  it('protects API routes', async () => {
    expect((await request(app).get('/api/employees')).status).toBe(401);
    expect((await request(app).get('/api/insights/summary')).status).toBe(401);
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
  });

  it('keeps the health check public', async () => {
    expect((await request(app).get('/health')).status).toBe(200);
  });

  it('rejects a token signed with a different secret', async () => {
    const forged = jwt.sign({}, 'attacker-secret-attacker-secret-1234', { subject: 'hr@acme.example' });

    const res = await request(app).get('/api/auth/me').set('Cookie', `session=${forged}`);

    expect(res.status).toBe(401);
  });

  it('rejects an expired token', async () => {
    const expired = jwt.sign({ exp: Math.floor(Date.now() / 1000) - 60 }, process.env.JWT_SECRET!, {
      subject: 'hr@acme.example',
    });

    const res = await request(app).get('/api/auth/me').set('Cookie', `session=${expired}`);

    expect(res.status).toBe(401);
  });

  it('returns the current user, and logout clears the session', async () => {
    const agent = await signedInAgent(app);

    expect((await agent.get('/api/auth/me')).body).toEqual({ email: 'hr@acme.example' });

    await agent.post('/api/auth/logout').expect(204);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });
});
