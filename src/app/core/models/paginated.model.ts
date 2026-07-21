/** Envelope de paginação devolvido por todos os endpoints de listagem paginados da API. */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number | null;
  limit: number | null;
  totalPages: number | null;
}
