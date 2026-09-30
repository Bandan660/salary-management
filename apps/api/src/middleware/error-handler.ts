import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../lib/http-error';

/** Every error response has the same shape: { error: { message, details? } } */

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: { message: `Route not found: ${req.method} ${req.path}` },
  });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: { message: 'Validation failed', details: err.issues },
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: { message: err.message, details: err.details },
    });
    return;
  }

  // Unknown error: log full details server-side, never leak internals to the client.
  console.error(err);
  res.status(500).json({ error: { message: 'Internal server error' } });
};
