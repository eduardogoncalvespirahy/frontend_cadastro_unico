export interface Session {
  id: string;
  credentialId: string;
  refreshtoken: string;
  expira: string;
  revogado: boolean;
  dataCriacao: string;
  dataAlteracao: string;
}
