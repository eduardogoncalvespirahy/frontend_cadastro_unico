export interface User {
  id: string;
  employeeId: string;
  username: string;
  email: string;
  status: number;
  dataCriacao: string;
  dataAlteracao: string;
}

export interface CreateUserRequest {
  employeeId: string;
  username: string;
  email: string;
  status?: number;
}

export interface UpdateUserRequest {
  employeeId?: string;
  username?: string;
  email?: string;
  status?: number;
}

/** Visão de usuário já unida ao colaborador de RH (view somente leitura). */
export interface UserProfile {
  userId: string;
  userUsername: string;
  userEmail: string;
  userStatus: number;

  employeeId: string;
  employeeNome: string;
  employeeMatricula: number | string;
  employeeDataAdmissao: string;

  employerId: string;

  locationId: string;
  locationName: string;

  departmentId: string;
  departmentNome: string;

  jobPositionId: string;
  jobPositionNome: string;

  workstationGroupId: string;
  workstationGroupNome: string;

  workshiftId: string;
  workshiftDescricao: string;

  costCenterId: string;
  costCenterNome: string;

  ultimaSincronizacao: string | null;
}
