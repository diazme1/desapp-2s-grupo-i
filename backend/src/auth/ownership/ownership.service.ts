import { ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class OwnershipService {
  assertOwner(authenticatedId: string, resourceUserId: string): void {
    if (authenticatedId !== resourceUserId) {
      throw new ForbiddenException('No tenés permiso para acceder a este recurso.');
    }
  }
}
