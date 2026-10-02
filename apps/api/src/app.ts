import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { employeesRouter } from './modules/employees/employee.routes';
import { metaRouter } from './modules/meta/meta.routes';

/**
 * Builds the Express app without starting a server.
 * Keeping this separate from server.ts lets tests call the app directly with supertest.
 */
export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/meta', metaRouter);
  app.use('/api/employees', employeesRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
