import { Role } from '../../generated/prisma/client';

export type AccessTokenPayload = {
  sub: string;
  email: string;
  role: Role;
  sid: string;
  ver: number;
  type: 'access';
  iat?: number;
  exp?: number;
};

export type RefreshTokenPayload = {
  sub: string;
  email: string;
  role: Role;
  sid: string;
  ver: number;
  type: 'refresh';
  iat?: number;
  exp?: number;
};

export type AuthSessionContext = {
  ipAddress: string;
  userAgent: string;
};
