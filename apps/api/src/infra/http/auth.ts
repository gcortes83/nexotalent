import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Role, User } from '../../modules/identity/domain/user.js';
import type { Deps } from '../../ports.js';
import { DomainError, ForbiddenError } from '../../shared/errors.js';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; role: Role; org: string | null };
    user: { sub: string; role: Role; org: string | null };
  }
}

class UnauthorizedError extends DomainError {
  constructor() {
    super(401, 'unauthorized', 'Autenticación requerida');
  }
}

/** Devuelve el usuario autenticado verificando rol. Simulación de Cognito en el MVP. */
export function makeAuth(app: FastifyInstance, deps: Deps) {
  return async function requireUser(req: FastifyRequest, ...roles: Role[]): Promise<User> {
    try {
      await req.jwtVerify();
    } catch {
      throw new UnauthorizedError();
    }
    const user = await deps.users.getById(req.user.sub);
    if (!user) throw new UnauthorizedError();
    if (roles.length && !roles.includes(user.role)) throw new ForbiddenError();
    return user;
  };
}
