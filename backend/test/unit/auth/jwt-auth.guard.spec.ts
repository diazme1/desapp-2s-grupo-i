import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../../../src/auth/guards/jwt-auth.guard';

function context(headers: Record<string, string>): ExecutionContext {
  const request = { headers };
  return { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  it('extrae el Bearer y guarda el payload en request.user', () => {
    const tokens = { verify: jest.fn().mockReturnValue({ sub: 'u1', correo: 'a@b.com' }) } as any;
    const guard = new JwtAuthGuard(tokens);
    const ctx = context({ authorization: 'Bearer abc' });
    expect(guard.canActivate(ctx)).toBe(true);
    expect(tokens.verify).toHaveBeenCalledWith('abc');
  });

  it('rechaza token ausente o inválido', () => {
    const guard = new JwtAuthGuard({ verify: jest.fn().mockImplementation(() => { throw new Error(); }) } as any);
    expect(() => guard.canActivate(context({}))).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(context({ authorization: 'Bearer bad' }))).toThrow(UnauthorizedException);
  });
});
