import jwt, { SignOptions } from 'jsonwebtoken';
import { Role } from '@prisma/client';

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
  organizationId?: string;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'fallback-access-secret-change-in-prod';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-change-in-prod';
const ACCESS_EXPIRY = (process.env.JWT_ACCESS_EXPIRY || '15m') as string;
const REFRESH_EXPIRY = (process.env.JWT_REFRESH_EXPIRY || '7d') as string;

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRY,
    issuer: 'saas-platform',
    audience: 'saas-platform-client',
  } as SignOptions);
};

export const generateRefreshToken = (payload: RefreshTokenPayload): string => {
  return jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRY,
    issuer: 'saas-platform',
  } as SignOptions);
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, ACCESS_SECRET, {
    issuer: 'saas-platform',
    audience: 'saas-platform-client',
  }) as TokenPayload;
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  return jwt.verify(token, REFRESH_SECRET, {
    issuer: 'saas-platform',
  }) as RefreshTokenPayload;
};

export const REFRESH_TOKEN_EXPIRY_DAYS = parseInt(
  (process.env.JWT_REFRESH_EXPIRY || '7d').replace('d', '')
);
