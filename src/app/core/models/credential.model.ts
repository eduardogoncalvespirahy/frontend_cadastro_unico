/** Formato "flat" devolvido pela API — sem nomes de usuário/sistema unidos. */
export interface Credential {
  id: string;
  userId: string;
  systemId: string;
  status: number;
  dataUltimoLogin: string;
  dataCriacao: string;
  dataAlteracao: string;
}

export interface CreateCredentialRequest {
  userId: string;
  systemId: string;
  senha: string;
  status?: number;
}

export interface UpdateCredentialRequest {
  senha?: string;
  status?: number;
}

/**
 * Visão enriquecida montada no front (a API não faz esse join): junta a
 * credencial com nome do usuário/sistema e os papéis/locais atribuídos.
 */
export interface CredentialView extends Credential {
  userNome: string | null;
  username: string | null;
  email: string | null;
  systemNome: string | null;
  roles: string[];
  locations: string[];
}
