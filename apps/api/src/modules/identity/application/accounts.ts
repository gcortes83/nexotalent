/**
 * Registro y login con contraseña (change add-accounts-jobs-notifications).
 * Simula el user pool de Cognito: en v2 este módulo delega en Cognito y conserva los mismos puertos.
 */
import { z } from 'zod';
import type { Deps } from '../../../ports.js';
import { ConflictError, DomainError } from '../../../shared/errors.js';
import { newId } from '../../../shared/ids.js';
import { hashPassword, PASSWORD_RULE, verifyPassword } from '../../../shared/password.js';
import type { Candidate } from '../../candidates/domain/candidate.js';
import { type AccountKind, matchesAccountKind, type User } from '../domain/user.js';

export class InvalidCredentialsError extends DomainError {
  constructor() {
    super(401, 'invalid-credentials', 'Correo o contraseña incorrectos. Verifica también el tipo de cuenta (candidato o empleador).');
  }
}

const email = z.email('Correo inválido').max(254).transform((e) => e.trim().toLowerCase());
const password = z.string().regex(PASSWORD_RULE, 'La contraseña debe tener al menos 8 caracteres, con letras y números');
const name = z.string().trim().min(2, 'Escribe tu nombre').max(120);

export const registerCandidateSchema = z.object({
  fullName: name,
  email,
  password,
  headline: z.string().trim().max(160).nullish(),
  country: z.string().trim().length(2).toUpperCase().nullish(),
  acceptPrivacy: z.literal(true, 'Debes aceptar el aviso de privacidad'),
});

export const registerEmployerSchema = z.object({
  companyName: z.string().trim().min(2, 'Escribe el nombre de la empresa').max(160),
  fullName: name,
  email,
  password,
  acceptPrivacy: z.literal(true, 'Debes aceptar el aviso de privacidad'),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
  kind: z.enum(['candidate', 'employer']),
});

async function ensureEmailFree(deps: Deps, e: string) {
  if (await deps.users.getByEmail(e)) throw new ConflictError('email-taken', 'Ya existe una cuenta con ese correo');
}

export async function registerCandidate(deps: Deps, input: z.infer<typeof registerCandidateSchema>): Promise<User> {
  await ensureEmailFree(deps, input.email);
  const now = deps.clock.now();
  const user: User = { id: newId('usr', now.getTime()), email: input.email, fullName: input.fullName, role: 'candidate', organizationId: null };
  await deps.users.create(user, hashPassword(input.password));
  const candidate: Candidate = {
    id: newId('cand', now.getTime()),
    userId: user.id,
    fullName: input.fullName,
    headline: input.headline ?? null,
    seniority: null,
    country: input.country ?? null,
    preferredModalities: [],
    salaryExpectation: null,
    resumeText: null,
    skills: [],
    embedding: null,
    updatedAt: now,
  };
  await deps.candidates.save(candidate);
  return user;
}

export async function registerEmployer(deps: Deps, input: z.infer<typeof registerEmployerSchema>): Promise<User> {
  await ensureEmailFree(deps, input.email);
  const now = deps.clock.now();
  const org = { id: newId('org', now.getTime()), name: input.companyName };
  await deps.organizations.create(org);
  const user: User = { id: newId('usr', now.getTime()), email: input.email, fullName: input.fullName, role: 'employer_admin', organizationId: org.id };
  await deps.users.create(user, hashPassword(input.password));
  return user;
}

/** Mismo error para correo inexistente, contraseña errónea o tipo de cuenta distinto (no revela qué falló). */
export async function loginWithPassword(deps: Deps, input: { email: string; password: string; kind: AccountKind }): Promise<User> {
  const user = await deps.users.getByEmail(input.email);
  const hash = user ? await deps.users.getPasswordHash(user.id) : null;
  const ok = verifyPassword(input.password, hash ?? DUMMY_HASH);
  if (!user || !hash || !ok || !matchesAccountKind(user, input.kind)) throw new InvalidCredentialsError();
  return user;
}

/** Hash fijo para igualar el tiempo de respuesta cuando el usuario no existe. */
const DUMMY_HASH = hashPassword('dummy-password-0', Buffer.alloc(16, 7));
