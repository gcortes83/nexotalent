import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { DomainError } from '../../shared/errors.js';

/** Errores → RFC 9457 Problem Details. Nunca expone stack ni PII. */
export function problemHandler(error: FastifyError | Error, req: FastifyRequest, reply: FastifyReply) {
  const send = (status: number, code: string, title: string, extra: Record<string, unknown> = {}) =>
    reply
      .status(status)
      .type('application/problem+json')
      .send({ type: `https://nexotalent.example.com/problems/${code}`, title, status, instance: req.url, ...extra });

  if (error instanceof DomainError) {
    return send(error.status, error.code, error.message, error.details ? { details: error.details } : {});
  }
  if (error instanceof ZodError) {
    return send(422, 'validation', 'Datos inválidos', {
      errors: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  const statusCode = (error as FastifyError).statusCode;
  if (statusCode && statusCode < 500) return send(statusCode, 'request', error.message);
  req.log.error({ err: error }, 'unhandled error');
  return send(500, 'internal', 'Error interno');
}
