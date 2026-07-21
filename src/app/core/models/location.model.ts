export interface Location {
  id: string;
  employerId: string;
  nome: string;
  descricao: string | null;
  status: number;
  dataCriacao: string;
  dataAlteracao: string;
}

export interface CreateLocationRequest {
  employerId: string;
  nome: string;
  descricao?: string | null;
  status?: number;
}

export interface UpdateLocationRequest {
  employerId?: string;
  nome?: string;
  descricao?: string | null;
  status?: number;
}
