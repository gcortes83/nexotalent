/**
 * Puertos (arquitectura hexagonal). Adaptadores: infra/memory (tests y demo sin BD)
 * e infra/db (PostgreSQL + pgvector).
 */
import type { Application } from './modules/applications/domain/application.js';
import type { Candidate } from './modules/candidates/domain/candidate.js';
import type { ExtractedSkill, Skill } from './modules/candidates/domain/skill.js';
import type { Organization, User } from './modules/identity/domain/user.js';
import type { Job } from './modules/jobs/domain/job.js';
import type { MatchResult } from './modules/matching/domain/types.js';
import type { EmailMessage, Notification } from './modules/notifications/domain/notification.js';
import type { Clock } from './shared/clock.js';

export interface UserRepo {
  getById(id: string): Promise<User | null>;
  getByEmail(email: string): Promise<User | null>;
  /** Inserta; lanza ConflictError("email-taken") si el correo ya existe. */
  create(user: User, passwordHash: string | null): Promise<void>;
  getPasswordHash(userId: string): Promise<string | null>;
}

export interface OrganizationRepo {
  get(id: string): Promise<Organization | null>;
  create(org: Organization): Promise<void>;
}

export interface SkillRepo {
  list(): Promise<Skill[]>;
}

export interface JobRepo {
  get(id: string): Promise<Job | null>;
  listPublished(): Promise<Job[]>;
  listByOrganization(organizationId: string): Promise<Job[]>;
  incrementApplicants(jobId: string, delta: number): Promise<void>;
  incrementPositionsFilled(jobId: string): Promise<void>;
  findByExternalId(organizationId: string, externalId: string): Promise<Job | null>;
  /** Inserta o actualiza la vacante completa (incluidas sus skills). Nunca borra filas. */
  save(job: Job): Promise<void>;
}

export interface CandidateRepo {
  get(id: string): Promise<Candidate | null>;
  getByUserId(userId: string): Promise<Candidate | null>;
  getMany(ids: string[]): Promise<Candidate[]>;
  save(candidate: Candidate): Promise<void>;
}

export interface ApplicationRepo {
  get(id: string): Promise<Application | null>;
  findByJobAndCandidate(jobId: string, candidateId: string): Promise<Application | null>;
  listByCandidate(candidateId: string): Promise<Application[]>;
  listByJob(jobId: string): Promise<Application[]>;
  listByOrganization(organizationId: string): Promise<Application[]>;
  /** Inserta; lanza ConflictError si ya existe (job, candidate). */
  create(app: Application): Promise<void>;
  /** Actualiza solo si la versión guardada es `expectedVersion`; si no, PreconditionFailedError. */
  update(app: Application, expectedVersion: number): Promise<void>;
}

export interface CachedMatch {
  result: MatchResult;
  computedAt: Date;
}

export interface MatchCache {
  get(candidateId: string, jobId: string, modelVersion: string): Promise<CachedMatch | null>;
  put(result: MatchResult, computedAt: Date): Promise<void>;
  invalidateCandidate(candidateId: string): Promise<void>;
  invalidateJob(jobId: string): Promise<void>;
}

export interface SkillExtractor {
  extract(resumeText: string, taxonomy: Skill[]): Promise<ExtractedSkill[]>;
}

export interface Embedder {
  embed(text: string): Promise<number[]>;
}

export interface NotificationRepo {
  create(n: Notification): Promise<void>;
  listByUser(userId: string, opts?: { unreadOnly?: boolean; limit?: number }): Promise<Notification[]>;
  countUnread(userId: string): Promise<number>;
  /** Marca como leída solo si pertenece al usuario; devuelve si existía. */
  markRead(id: string, userId: string, at: Date): Promise<boolean>;
  markAllRead(userId: string, at: Date): Promise<void>;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

export interface Deps {
  users: UserRepo;
  organizations: OrganizationRepo;
  notifications: NotificationRepo;
  email: EmailSender;
  skills: SkillRepo;
  jobs: JobRepo;
  candidates: CandidateRepo;
  applications: ApplicationRepo;
  matchCache: MatchCache;
  extractor: SkillExtractor;
  embedder: Embedder;
  clock: Clock;
}
