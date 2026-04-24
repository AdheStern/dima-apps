// src/lib/actions/types/sla-type-types.ts

export interface CreateSlaTypeDTO {
  name: string;
  description?: string | null;
  hoursPerDay: number;
  daysPerWeek: number;
  responseTimeHours: number;
}

export interface UpdateSlaTypeDTO {
  id: string;
  name?: string;
  description?: string | null;
  hoursPerDay?: number;
  daysPerWeek?: number;
  responseTimeHours?: number;
}

export interface SlaTypeWithRelations {
  id: string;
  name: string;
  description: string | null;
  hoursPerDay: number;
  daysPerWeek: number;
  responseTimeHours: number;
  createdAt: Date;
  updatedAt: Date;
  _count: { clients: number };
}
