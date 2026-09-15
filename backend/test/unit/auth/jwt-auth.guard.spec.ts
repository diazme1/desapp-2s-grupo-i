import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../../../src/auth/guards/jwt-auth.guard';

function context(headers: Record<string, string>) {
  const request = { headers };
  const executionContext = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { executionContext, request };
}

describe('JwtAuthGuard', () => {
  it('extrae el Bearer y guarda el payload en request.user', () => {
    const tokens = { verify: jest.fn().mockReturnValue({ sub: 'u1', correo: 'a@b.com' }) } as any;
    const guard = new JwtAuthGuard(tokens);
    const { executionContext, request } = context({ authorization: 'Bearer abc' });
    expect(guard.canActivate(executionContext)).toBe(true);
    expect(tokens.verify).toHaveBeenCalledWith('abc');
    expect(request.user).toEqual({ sub: 'u1', correo: 'a@b.com' });
  });

  it('rechaza un token ausente', () => {
    const guard = new JwtAuthGuard({ verify: jest.fn().mockImplementation(() => { throw new Error(); }) } as any);
    expect(() => guard.canActivate(context({}).executionContext)).toThrow(UnauthorizedException);
  });

  it('rechaza un token inválido', () => {
    const guard = new JwtAuthGuard({ verify: jest.fn().mockImplementation(() => { throw new Error(); }) } as any);
    expect(() =>
      guard.canActivate(context({ authorization: 'Bearer bad' }).executionContext),
    ).toThrow(UnauthorizedException);
  });

  it('rechaza un payload sin sub', () => {
    const guard = new JwtAuthGuard({ verify: jest.fn().mockReturnValue({ correo: 'a@b.com' }) } as any);
    expect(() => guard.canActivate(context({ authorization: 'Bearer no-sub' }).executionContext)).toThrow(
      UnauthorizedException,
    );
  });
});
