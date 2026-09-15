import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

export interface JwtPayload {
  sub: string;
  correo: string;
}

@Injectable()
export class JwtTokenService {
  private readonly secret: string;
  private readonly expiresIn: string;
  private readonly algorithm: 'HS256' | 'HS384' | 'HS512';

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.secret = config.get<string>('JWT_SECRET') ?? 'test-only-secret-for-jest';
    this.expiresIn = config.get<string>('JWT_EXPIRES_IN') ?? '15m';
    const algorithm = config.get<string>('JWT_ALGORITHM');
    this.algorithm = ['HS256', 'HS384', 'HS512'].includes(algorithm ?? '')
      ? (algorithm as 'HS256' | 'HS384' | 'HS512')
      : 'HS256';
  }

  sign(payload: JwtPayload): string {
    return this.jwt.sign(payload, {
      secret: this.secret,
      expiresIn: this.expiresIn as any,
      algorithm: this.algorithm,
    });
  }

  verify(token: string): JwtPayload {
    return this.jwt.verify<JwtPayload>(token, { secret: this.secret, algorithms: [this.algorithm] });
  }

  expirationSeconds(): number {
    const match = /^(\d+)(s|m|h|d)$/.exec(this.expiresIn);
    if (!match) return 900;
    const value = Number(match[1]);
    return value * ({ s: 1, m: 60, h: 3600, d: 86400 } as Record<string, number>)[match[2]];
  }
}
