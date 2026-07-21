export type LoginIdentifierType = 'email' | 'username' | 'registerNumber';

export interface LoginUserRequest {
  email?: string;
  username?: string;
  registerNumber?: number;
  password: string;
  systemId?: string;
}

export interface LoginUserResponse {
  userId: string;
  credentialId: string;
  token: string;
  refreshToken: string;
}


export interface RefreshResponse {
  userId: string;
  credentialId: string;
}
