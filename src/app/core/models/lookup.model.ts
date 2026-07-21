/**
 * Modelos das tabelas de apoio de RH — todas sincronizadas do Senior e
 * somente leitura aqui. `name`/`description` ficam null até a primeira sincronização.
 */
export interface Department {
  id: string;
  name: string | null;
}

export interface JobPosition {
  id: string;
  name: string | null;
}

export interface CostCenter {
  id: string;
  name: string | null;
}

export interface Workshift {
  id: string;
  description: string | null;
}

export interface WorkstationGroup {
  id: string;
  name: string | null;
}
