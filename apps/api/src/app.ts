import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { requireAuth } from './middleware/require-auth';
import { createAuthRouter } from './modules/auth/auth.routes';
import { employeesRouter } from './modules/employees/employee.routes';
import { insightsRouter } from './modules/insights/insight.routes';
import { metaRouter } from './modules/meta/meta.routes';
import { salariesRouter } from './modules/salaries/salary.routes';

/**
 * Builds the Express app without starting a server.
 * Keeping this separate from server.ts lets tests call the app directly with supertest.
 */
export function createApp() {
  const app = express();

  // Behind the hosting platform's proxy: trust it so rate limiting sees the real client IP.
  if (env.NODE_ENV === 'production') app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', createAuthRouter());

  // Everything below requires a signed-in HR user.
  app.use('/api', requireAuth);
  app.use('/api/meta', metaRouter);
  app.use('/api/employees', employeesRouter);
  app.use('/api/employees/:id/salaries', salariesRouter);
  app.use('/api/insights', insightsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
