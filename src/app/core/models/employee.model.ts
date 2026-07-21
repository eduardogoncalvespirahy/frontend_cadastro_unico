/** Colaborador sincronizado do RH (Senior) — somente leitura nesta aplicação. */
export interface Employee {
  id: string;
  companyNumber: number | null;
  registerNumber: number | null;
  registrationNumber: number | null;
  personId: string | null;
  personName: string | null;
  hireDate: string | null;
  dismissalDate: string | null;
  hash: string | null;
  employerId: string | null;
  departmentId: string | null;
  jobPositionId: string | null;
  workstationGroupId: string | null;
  workshiftId: string | null;
  costCenterId: string | null;
  syncedAt: string | null;
}
