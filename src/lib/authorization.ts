export const SCHOOL_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  VICE_ADMIN: 'vice_admin',
  TEACHER: 'teacher',
  INSTRUCTOR: 'instructor',
  STUDENT: 'student',
  PARENT: 'parent',
} as const;

export type SchoolRole = typeof SCHOOL_ROLES[keyof typeof SCHOOL_ROLES];

export const SCHOOL_ADMIN_ROLES: SchoolRole[] = [SCHOOL_ROLES.OWNER, SCHOOL_ROLES.ADMIN, SCHOOL_ROLES.VICE_ADMIN];
export const SCHOOL_ACADEMIC_STAFF_ROLES: SchoolRole[] = [...SCHOOL_ADMIN_ROLES, SCHOOL_ROLES.TEACHER, SCHOOL_ROLES.INSTRUCTOR];
export const SCHOOL_INSTRUCTOR_ROLES: SchoolRole[] = [...SCHOOL_ADMIN_ROLES, SCHOOL_ROLES.TEACHER, SCHOOL_ROLES.INSTRUCTOR];

export const ROLE_LABELS: Record<string, string> = {
  owner: 'School owner',
  admin: 'School administrator',
  school_admin: 'School administrator',
  vice_admin: 'Vice administrator',
  teacher: 'Teacher',
  instructor: 'Instructor',
  student: 'Learner',
  learner: 'Learner',
  parent: 'Parent or guardian',
};

export const normalizeRole = (role: string | null | undefined): string => {
  const value = role?.trim().toLowerCase();
  if (value === 'school_owner' || value === 'school-owner') return SCHOOL_ROLES.OWNER;
  if (value === 'school_admin' || value === 'school-admin') return SCHOOL_ROLES.ADMIN;
  if (value === 'learner') return SCHOOL_ROLES.STUDENT;
  return value ?? '';
};

export const roleLabel = (role: string): string => ROLE_LABELS[normalizeRole(role)] ?? 'Authorized user';
