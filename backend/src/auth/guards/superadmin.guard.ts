import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '../../users/domain/user';

@Injectable()
export class SuperadminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user?: { rol?: string };
    }>();
    if (request.user?.rol !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('La operación requiere rol superadmin.');
    }
    return true;
  }
}
