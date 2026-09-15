import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtTokenService } from '../strategies/jwt-token.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly tokens: JwtTokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string>; user?: unknown }>();
    const header = request.headers?.authorization;
    const match = typeof header === 'string' ? /^Bearer\s+(.+)$/i.exec(header) : null;
    if (!match) throw new UnauthorizedException('Token Bearer requerido.');
    try {
      const payload = this.tokens.verify(match[1]);
      if (!payload || typeof payload.sub !== 'string' || !payload.sub) {
        throw new Error('JWT sin identidad');
      }
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o vencido.');
    }
  }
}
