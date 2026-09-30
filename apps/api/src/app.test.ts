import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app';

describe('app', () => {
  const app = createApp();

  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('returns a consistent 404 shape for unknown routes', async () => {
    const res = await request(app).get('/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.error.message).toContain('/does-not-exist');
  });
});
