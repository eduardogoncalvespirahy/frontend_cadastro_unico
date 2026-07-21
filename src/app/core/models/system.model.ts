export interface System {
  id: string;
  nome: string;
  descricao: string | null;
  url: string | null;
  status: number;
  dataCriacao: string;
  dataAlteracao: string;
}

export interface CreateSystemRequest {
  nome: string;
  descricao?: string | null;
  url?: string | null;
  status?: number;
}

export interface UpdateSystemRequest {
  nome?: string;
  descricao?: string | null;
  url?: string | null;
  status?: number;
}
