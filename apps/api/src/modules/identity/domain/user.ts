export const ROLES = ['candidate', 'recruiter', 'employer_admin', 'platform_admin'] as const;
export type Role = (typeof ROLES)[number];

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  /** Solo para recruiter / employer_admin. */
  organizationId: string | null;
}

export interface Organization {
  id: string;
  name: string;
}

/** Tipo de cuenta que elige la persona en el login (pestaña Candidato / Empleador). */
export type AccountKind = 'candidate' | 'employer';

export const isEmployer = (u: Pick<User, 'role'>): boolean => u.role === 'recruiter' || u.role === 'employer_admin';

export const matchesAccountKind = (u: Pick<User, 'role'>, kind: AccountKind): boolean =>
  kind === 'candidate' ? u.role === 'candidate' : isEmployer(u);
