import { randomUUID, createHash } from 'crypto';

import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CookieOptions, Request, Response } from 'express';

import { Role } from '../../generated/prisma/client';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { AuthSessionsRepository } from './auth-sessions.repository';
import { AuthSessionContext, RefreshTokenPayload } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const DEFAULT_ACCESS_TOKEN_EXPIRES_IN_SECONDS = 900;
const DEFAULT_REFRESH_TOKEN_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7;
const DEFAULT_REFRESH_COOKIE_NAME = 'smartops_refresh_token';

type AuthenticatedUserProfile = {
  id: string;
  email: string;
  role: Role;
  createdAt: Date;
};

type AuthTokenResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AuthenticatedUserProfile;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly authSessionsRepository: AuthSessionsRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private isPublicRegistrationEnabled() {
    return this.configService.get<boolean>('AUTH_ALLOW_PUBLIC_REGISTRATION', false);
  }

  private isProduction() {
    return this.configService.get<string>('NODE_ENV') === 'production';
  }

  private getAccessTokenSecret() {
    return this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
  }

  private getRefreshTokenSecret() {
    return this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  private getAccessTokenExpiresInSeconds() {
    return this.configService.get<number>(
      'JWT_ACCESS_EXPIRES_IN',
      this.configService.get<number>(
        'JWT_EXPIRES_IN',
        DEFAULT_ACCESS_TOKEN_EXPIRES_IN_SECONDS,
      ),
    );
  }

  private getRefreshTokenExpiresInSeconds() {
    return this.configService.get<number>(
      'JWT_REFRESH_EXPIRES_IN',
      DEFAULT_REFRESH_TOKEN_EXPIRES_IN_SECONDS,
    );
  }

  private getRefreshCookieName() {
    return this.configService.get<string>(
      'AUTH_REFRESH_COOKIE_NAME',
      DEFAULT_REFRESH_COOKIE_NAME,
    );
  }

  private getRefreshCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.isProduction(),
      sameSite: this.isProduction() ? 'none' : 'lax',
      path: '/api/auth',
      maxAge: this.getRefreshTokenExpiresInSeconds() * 1000,
    };
  }

  private setRefreshTokenCookie(response: Response, refreshToken: string) {
    response.cookie(
      this.getRefreshCookieName(),
      refreshToken,
      this.getRefreshCookieOptions(),
    );
  }

  private clearRefreshTokenCookie(response: Response) {
    response.clearCookie(
      this.getRefreshCookieName(),
      this.getRefreshCookieOptions(),
    );
  }

  private getRefreshTokenFromRequest(request: Request) {
    const cookieHeader = request.headers.cookie;

    if (!cookieHeader) {
      return '';
    }

    const cookieEntries = cookieHeader.split(';');

    for (const entry of cookieEntries) {
      const [rawName, ...rawValue] = entry.split('=');
      const cookieName = rawName?.trim();

      if (cookieName !== this.getRefreshCookieName()) {
        continue;
      }

      try {
        return decodeURIComponent(rawValue.join('=').trim());
      } catch {
        return rawValue.join('=').trim();
      }
    }

    return '';
  }

  private createRefreshTokenHash(refreshToken: string) {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  private buildSessionContext(request: Request): AuthSessionContext {
    const forwardedFor = request.headers['x-forwarded-for'];
    const forwardedValue = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor;
    const ipAddress = String(
      forwardedValue || request.ip || request.socket.remoteAddress || '',
    )
      .split(',')[0]
      .trim();
    const userAgentHeader = request.headers['user-agent'];

    return {
      ipAddress,
      userAgent: String(
        Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader || '',
      ).trim(),
    };
  }

  private buildAuthenticatedUserProfile(user: {
    id: string;
    email: string;
    role: Role;
    createdAt: Date;
  }): AuthenticatedUserProfile {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  private async signAccessToken(
    user: AuthenticatedUserProfile,
    sessionId: string,
    accessTokenVersion: number,
  ) {
    return this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        sid: sessionId,
        ver: accessTokenVersion,
        type: 'access',
      },
      {
        secret: this.getAccessTokenSecret(),
        expiresIn: this.getAccessTokenExpiresInSeconds(),
      },
    );
  }

  private async signRefreshToken(
    user: AuthenticatedUserProfile,
    sessionId: string,
    accessTokenVersion: number,
  ) {
    return this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        sid: sessionId,
        ver: accessTokenVersion,
        type: 'refresh',
      },
      {
        secret: this.getRefreshTokenSecret(),
        expiresIn: this.getRefreshTokenExpiresInSeconds(),
      },
    );
  }

  private buildRefreshTokenExpirationDate() {
    return new Date(Date.now() + this.getRefreshTokenExpiresInSeconds() * 1000);
  }

  private async createTokenResponse(
    user: AuthenticatedUserProfile,
    sessionId: string,
    accessTokenVersion: number,
  ): Promise<{
    response: AuthTokenResponse;
    refreshToken: string;
    refreshTokenHash: string;
    refreshTokenExpiresAt: Date;
  }> {
    const accessToken = await this.signAccessToken(
      user,
      sessionId,
      accessTokenVersion,
    );
    const refreshToken = await this.signRefreshToken(
      user,
      sessionId,
      accessTokenVersion,
    );
    const refreshTokenExpiresAt = this.buildRefreshTokenExpirationDate();

    return {
      response: {
        accessToken,
        tokenType: 'Bearer',
        expiresIn: this.getAccessTokenExpiresInSeconds(),
        user,
      },
      refreshToken,
      refreshTokenHash: this.createRefreshTokenHash(refreshToken),
      refreshTokenExpiresAt,
    };
  }

  private async revokeSessionByRefreshToken(refreshToken: string) {
    if (!refreshToken) {
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        {
          secret: this.getRefreshTokenSecret(),
        },
      );

      if (payload.type !== 'refresh') {
        return;
      }

      await this.authSessionsRepository.revokeSession(payload.sid, new Date());
    } catch {
      // Ignore logout cleanup failures.
    }
  }

  async register(registerDto: RegisterDto) {
    if (!this.isPublicRegistrationEnabled()) {
      throw new ForbiddenException(
        'Public registration is disabled. Seed the initial admin account instead.',
      );
    }

    const usersCount = await this.usersService.countUsers();

    if (usersCount > 0) {
      throw new ForbiddenException(
        'Bootstrap registration is only available before the first user exists.',
      );
    }

    const createUserDto: CreateUserDto = {
      email: registerDto.email,
      password: registerDto.password,
      role: Role.ADMIN,
    };
    const user = await this.usersService.createUserWithPlainPassword(createUserDto);

    return this.buildAuthenticatedUserProfile(user);
  }

  async login(loginDto: LoginDto, request: Request, response: Response) {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const sessionId = randomUUID();
    const accessTokenVersion = 1;
    const sessionContext = this.buildSessionContext(request);
    const userProfile = this.buildAuthenticatedUserProfile(user);
    const tokenBundle = await this.createTokenResponse(
      userProfile,
      sessionId,
      accessTokenVersion,
    );

    await this.authSessionsRepository.createSession({
      id: sessionId,
      userId: userProfile.id,
      accessTokenVersion,
      refreshTokenHash: tokenBundle.refreshTokenHash,
      expiresAt: tokenBundle.refreshTokenExpiresAt,
      lastUsedAt: new Date(),
      userAgent: sessionContext.userAgent,
      ipAddress: sessionContext.ipAddress,
    });

    this.setRefreshTokenCookie(response, tokenBundle.refreshToken);

    return tokenBundle.response;
  }

  async refresh(request: Request, response: Response) {
    const refreshToken = this.getRefreshTokenFromRequest(request);

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required.');
    }

    let payload: RefreshTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.getRefreshTokenSecret(),
      });
    } catch {
      this.clearRefreshTokenCookie(response);
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    if (payload.type !== 'refresh') {
      this.clearRefreshTokenCookie(response);
      throw new UnauthorizedException('Invalid refresh token type.');
    }

    const session = await this.authSessionsRepository.findSessionById(payload.sid);
    const now = new Date();

    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt <= now ||
      session.accessTokenVersion !== payload.ver
    ) {
      if (session && !session.revokedAt) {
        await this.authSessionsRepository.revokeSession(session.id, now);
      }

      this.clearRefreshTokenCookie(response);
      throw new UnauthorizedException('Refresh session is invalid or expired.');
    }

    const refreshTokenHash = this.createRefreshTokenHash(refreshToken);

    if (session.refreshTokenHash !== refreshTokenHash) {
      await this.authSessionsRepository.revokeSession(session.id, now);
      this.clearRefreshTokenCookie(response);
      throw new UnauthorizedException('Refresh session is invalid or expired.');
    }

    let user: AuthenticatedUserProfile;

    try {
      user = this.buildAuthenticatedUserProfile(
        await this.usersService.findUserForAuthById(payload.sub),
      );
    } catch {
      await this.authSessionsRepository.revokeSession(session.id, now);
      this.clearRefreshTokenCookie(response);
      throw new UnauthorizedException('Refresh session is invalid or expired.');
    }

    const sessionContext = this.buildSessionContext(request);
    const nextAccessTokenVersion = session.accessTokenVersion + 1;
    const tokenBundle = await this.createTokenResponse(
      user,
      session.id,
      nextAccessTokenVersion,
    );

    await this.authSessionsRepository.updateSession(session.id, {
      accessTokenVersion: nextAccessTokenVersion,
      refreshTokenHash: tokenBundle.refreshTokenHash,
      expiresAt: tokenBundle.refreshTokenExpiresAt,
      lastUsedAt: now,
      userAgent: sessionContext.userAgent,
      ipAddress: sessionContext.ipAddress,
    });

    this.setRefreshTokenCookie(response, tokenBundle.refreshToken);

    return tokenBundle.response;
  }

  async logout(request: Request, response: Response) {
    const refreshToken = this.getRefreshTokenFromRequest(request);

    await this.revokeSessionByRefreshToken(refreshToken);
    this.clearRefreshTokenCookie(response);

    return {
      success: true,
    };
  }

  getAuthenticatedProfile(userId: string) {
    return this.usersService.findUserProfileById(userId);
  }
}
