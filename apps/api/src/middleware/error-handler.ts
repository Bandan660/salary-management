import { Prisma } from '@prisma/client';
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

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint (e.g. duplicate email): the database is the source of truth.
    if (err.code === 'P2002') {
      const fields = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'value';
      res.status(409).json({ error: { message: `A record with this ${fields} already exists` } });
      return;
    }
    // Record to update/delete not found.
    if (err.code === 'P2025') {
      res.status(404).json({ error: { message: 'Not found' } });
      return;
    }
  }

  // Unknown error: log full details server-side, never leak internals to the client.
  console.error(err);
  res.status(500).json({ error: { message: 'Internal server error' } });
};
