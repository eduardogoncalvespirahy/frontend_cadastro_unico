/**
 * Copie este arquivo para `app-config.ts` (mesma pasta) e ajuste os valores
 * para o seu ambiente. `app-config.ts` é o que de fato é importado por
 * `environment.ts` — este `.example` serve só de referência/modelo.
 */
export const appConfig = {
  /** Base da API do backend (inclui o prefixo /api). */
  apiUrl: 'http://localhost:3000/api',

  /**
   * Id do sistema "Cadastro Único" na tabela unico.systems deste ambiente
   * (veja database/seed_cadastro_unico_system.sql no backend). Usado como
   * systemId padrão no login quando nenhum outro for informado.
   */
  systemId: '3',
};
