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
