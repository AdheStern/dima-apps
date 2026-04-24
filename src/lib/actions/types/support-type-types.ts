// src/lib/actions/types/support-type-types.ts

export interface CreateSupportTypeDTO {
  name: string;
  description?: string | null;
}

export interface UpdateSupportTypeDTO {
  id: string;
  name?: string;
  description?: string | null;
  active?: boolean;
}

export interface SupportTypeWithRelations {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { tickets: number };
}
