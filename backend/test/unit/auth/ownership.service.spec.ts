import { ForbiddenException } from '@nestjs/common';
import { OwnershipService } from '../../../src/auth/ownership/ownership.service';

describe('OwnershipService', () => {
  it('permite al propietario acceder a su recurso', () => {
    expect(() => new OwnershipService().assertOwner('user-a', 'user-a')).not.toThrow();
  });

  it('rechaza el acceso de otro usuario con 403', () => {
    expect(() => new OwnershipService().assertOwner('user-a', 'user-b')).toThrow(ForbiddenException);
  });
});
