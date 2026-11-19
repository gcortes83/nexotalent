import type { Application } from '../../modules/applications/domain/application.js';
import type { Candidate } from '../../modules/candidates/domain/candidate.js';
import type { Job } from '../../modules/jobs/domain/job.js';
import type { User } from '../../modules/identity/domain/user.js';
import type { MatchResult } from '../../modules/matching/domain/types.js';
import type { Notification } from '../../modules/notifications/domain/notification.js';
import type { CachedMatch, Deps, EmailSender } from '../../ports.js';
import type { Clock } from '../../shared/clock.js';
import { ConflictError, PreconditionFailedError } from '../../shared/errors.js';
import type { SeedData } from '../../seed/seed-data.js';
import { aiAdapters } from '../ai/mock-ai.js';
import { createLogEmailSender } from '../email/email-senders.js';

const clone = <T>(v: T): T => structuredClone(v);

/** Adaptadores en memoria: tests HTTP y modo demo sin base de datos (STORAGE=memory). */
export function createMemoryDeps(seed: SeedData, clock: Clock, email: EmailSender = createLogEmailSender()): Deps {
  const users = new Map<string, User>(seed.users.map((u) => [u.id, clone(u)]));
  const passwords = new Map(Object.entries(seed.passwordHashes ?? {}));
  const organizations = new Map(seed.organizations.map((o) => [o.id, clone(o)]));
  const notifications: Notification[] = [];
  const jobs = new Map(seed.jobs.map((j) => [j.id, clone(j)]));
  const candidates = new Map(seed.candidates.map((c) => [c.id, clone(c)]));
  const applications = new Map(seed.applications.map((a) => [a.id, clone(a)]));
  const cache = new Map<string, CachedMatch>();
  const key = (c: string, j: string) => `${c}:${j}`;

  return {
    clock,
    ...aiAdapters(),
    email,
    users: {
      getById: async (id) => clone(users.get(id) ?? null),
      getByEmail: async (e) => clone([...users.values()].find((u) => u.email === e.toLowerCase()) ?? null),
      create: async (u, hash) => {
        if ([...users.values()].some((x) => x.email === u.email)) throw new ConflictError('email-taken', 'Ya existe una cuenta con ese correo');
        users.set(u.id, clone(u));
        if (hash) passwords.set(u.id, hash);
      },
      getPasswordHash: async (id) => passwords.get(id) ?? null,
    },
    organizations: {
      get: async (id) => clone(organizations.get(id) ?? null),
      create: async (o) => void organizations.set(o.id, clone(o)),
    },
    notifications: {
      create: async (n) => void notifications.unshift(clone(n)),
      listByUser: async (userId, opts = {}) =>
        notifications
          .filter((n) => n.userId === userId && (!opts.unreadOnly || !n.readAt))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, opts.limit ?? 50)
          .map(clone),
      countUnread: async (userId) => notifications.filter((n) => n.userId === userId && !n.readAt).length,
      markRead: async (id, userId, at) => {
        const n = notifications.find((x) => x.id === id && x.userId === userId);
        if (n && !n.readAt) n.readAt = at;
        return !!n;
      },
      markAllRead: async (userId, at) => {
        for (const n of notifications) if (n.userId === userId && !n.readAt) n.readAt = at;
      },
    },
    skills: { list: async () => clone(seed.skills) },
    jobs: {
      get: async (id) => clone(jobs.get(id) ?? null),
      listPublished: async () => [...jobs.values()].filter((j) => j.status === 'published').map(clone),
      listByOrganization: async (org) => [...jobs.values()].filter((j) => j.organizationId === org).map(clone),
      incrementApplicants: async (id, delta) => {
        const j = jobs.get(id);
        if (j) j.applicantsCount = Math.max(0, j.applicantsCount + delta);
      },
      incrementPositionsFilled: async (id) => {
        const j = jobs.get(id);
        if (j) j.positionsFilled = Math.min(j.positionsTotal, j.positionsFilled + 1);
      },
      findByExternalId: async (org, ext) =>
        clone([...jobs.values()].find((j) => j.organizationId === org && j.externalId === ext) ?? null),
      save: async (j) => void jobs.set(j.id, clone(j)),
    },
    candidates: {
      get: async (id) => clone(candidates.get(id) ?? null),
      getByUserId: async (userId) => clone([...candidates.values()].find((c) => c.userId === userId) ?? null),
      getMany: async (ids) => ids.map((id) => candidates.get(id)).filter((c): c is Candidate => !!c).map(clone),
      save: async (c) => void candidates.set(c.id, clone(c)),
    },
    applications: {
      get: async (id) => clone(applications.get(id) ?? null),
      findByJobAndCandidate: async (jobId, candidateId) =>
        clone([...applications.values()].find((a) => a.jobId === jobId && a.candidateId === candidateId) ?? null),
      listByCandidate: async (cid) => [...applications.values()].filter((a) => a.candidateId === cid).map(clone),
      listByJob: async (jid) => [...applications.values()].filter((a) => a.jobId === jid).map(clone),
      listByOrganization: async (org) => [...applications.values()].filter((a) => a.organizationId === org).map(clone),
      create: async (a: Application) => {
        if ([...applications.values()].some((x) => x.jobId === a.jobId && x.candidateId === a.candidateId)) {
          throw new ConflictError('already-applied', 'Ya te postulaste a esta vacante');
        }
        applications.set(a.id, clone(a));
      },
      update: async (a: Application, expectedVersion: number) => {
        if (applications.get(a.id)?.version !== expectedVersion) throw new PreconditionFailedError();
        applications.set(a.id, clone(a));
      },
    },
    matchCache: {
      get: async (c, j, v) => {
        const hit = cache.get(key(c, j));
        return hit && hit.result.modelVersion === v ? clone(hit) : null;
      },
      put: async (result: MatchResult, computedAt: Date) => void cache.set(key(result.candidateId, result.jobId), clone({ result, computedAt })),
      invalidateCandidate: async (cid) => {
        for (const k of [...cache.keys()]) if (k.startsWith(`${cid}:`)) cache.delete(k);
      },
      invalidateJob: async (jid) => {
        for (const k of [...cache.keys()]) if (k.endsWith(`:${jid}`)) cache.delete(k);
      },
    },
  };
}

export type { Job };
