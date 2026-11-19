/** Errores de dominio → RFC 9457 Problem Details (ver infra/http/problem.ts). */
export class DomainError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}
export class NotFoundError extends DomainError {
  constructor(what: string) {
    super(404, 'not-found', `${what} no encontrado`);
  }
}
export class ForbiddenError extends DomainError {
  constructor(message = 'No tienes permiso para esta acción') {
    super(403, 'forbidden', message);
  }
}
export class ConflictError extends DomainError {
  constructor(code: string, message: string, details?: unknown) {
    super(409, code, message, details);
  }
}
export class PreconditionFailedError extends DomainError {
  constructor(message = 'La versión del recurso cambió; recarga e intenta de nuevo') {
    super(412, 'version-mismatch', message);
  }
}
export class ValidationError extends DomainError {
  constructor(message: string, details?: unknown) {
    super(422, 'validation', message, details);
  }
}
