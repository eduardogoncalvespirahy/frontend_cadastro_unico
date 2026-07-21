/**
 * O backend guarda o access token e o refresh token em cookies httpOnly
 * (inacessíveis via JS). O corpo da resposta de login de usuário só traz os
 * identificadores — é a partir do `credentialId` que o front descobre os
 * papéis do usuário logado (GET /credentials-roles/roles/credential/:id).
 */
export interface LoginUserRequest {
  username?: string;
  email?: string;
  registerNumber?: number;
  password: string;
  systemId?: string;
}

export interface LoginUserResponse {
  userId: string;
  credentialId: string;
}

export interface RefreshResponse {
  userId: string;
  credentialId: string;
}

export interface WhoAmI {
  userId: string;
  credentialId: string;
  roles: string[];
  userProfile?: import('./user.model').UserProfile;
}
