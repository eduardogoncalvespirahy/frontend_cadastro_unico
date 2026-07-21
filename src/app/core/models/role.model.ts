/** Papéis funcionam como permissões: ADMIN, READ, CREATE, UPDATE, DELETE (ou nomes livres). */
export interface Role {
  id: string;
  systemId: string;
  nome: string;
  descricao: string | null;
  status: number;
  dataCriacao: string;
  dataAlteracao: string;
}

export interface CreateRoleRequest {
  systemId: string;
  nome: string;
  descricao?: string | null;
  status?: number;
}

export interface UpdateRoleRequest {
  systemId?: string;
  nome?: string;
  descricao?: string | null;
  status?: number;
}

/** Papéis "de sistema" (permissões padrão que toda credencial pode ter). */
export const WELL_KNOWN_ROLES = ['ADMIN', 'READ', 'CREATE', 'UPDATE', 'DELETE'] as const;
