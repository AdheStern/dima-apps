// src/lib/actions/types/action-types.ts

import type {
  InvitationStatus,
  OrgRole,
  UserRole,
  UserStatus,
} from "@prisma/client";

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UserFilters {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  departmentId?: string;
  managerId?: string;
}

export interface CreateUserDTO {
  name: string;
  email: string;
  password: string;
  phone?: string | null;
  birthDate?: Date | null;
  image?: string | null;
  role?: UserRole;
  status?: UserStatus;
  departmentId?: string | null;
  managerId?: string | null;
}

export interface UpdateUserDTO {
  id: string;
  name?: string;
  email?: string;
  phone?: string | null;
  birthDate?: Date | null;
  image?: string | null;
  role?: UserRole;
  status?: UserStatus;
  departmentId?: string | null;
  managerId?: string | null;
  banned?: boolean;
  banReason?: string | null;
  banExpires?: Date | null;
}

export interface UserWithRelations {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  phone: string | null;
  birthDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  banned: boolean | null;
  banReason: string | null;
  banExpires: Date | null;
  role: UserRole;
  status: UserStatus;
  departmentId: string | null;
  managerId: string | null;
  department?: {
    id: string;
    name: string;
  } | null;
  manager?: {
    id: string;
    name: string;
    role: UserRole;
  } | null;
  subordinates: {
    id: string;
    name: string;
    role: UserRole;
  }[];
}

export interface CreateDepartmentDTO {
  name: string;
  description?: string | null;
  parentId?: string | null;
}

export interface UpdateDepartmentDTO {
  id: string;
  name?: string;
  description?: string | null;
  parentId?: string | null;
}

export interface DepartmentWithRelations {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  parent?: {
    id: string;
    name: string;
  } | null;
  children: {
    id: string;
    name: string;
  }[];
  _count: {
    users: number;
  };
}

export interface DepartmentDetail extends DepartmentWithRelations {
  users: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  }[];
}

export interface DepartmentNode {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  children: DepartmentNode[];
  userCount: number;
}

export interface CreateOrganizationDTO {
  name: string;
  slug: string;
  logo?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface UpdateOrganizationDTO {
  id: string;
  name?: string;
  slug?: string;
  logo?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface OrganizationWithRelations {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  members: OrganizationMemberWithUser[];
  _count: {
    members: number;
  };
}

export interface OrganizationDetail extends OrganizationWithRelations {
  invitations: OrganizationInvitation[];
}

export interface AddMemberDTO {
  organizationId: string;
  userId: string;
  role?: OrgRole;
}

export interface InviteMemberDTO {
  organizationId: string;
  email: string;
  role?: OrgRole;
  inviterId: string;
}

export interface OrganizationMemberWithUser {
  id: string;
  organizationId: string;
  userId: string;
  role: OrgRole;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

export interface OrganizationInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: OrgRole;
  status: InvitationStatus;
  inviterId: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
