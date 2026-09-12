import { User } from '../../../src/users/domain/user';

describe('User', () => {
  it('genera id y fecha al crear un usuario', () => {
    const user = User.create({ correo: 'a@b.com', passwordHash: 'hash' });
    expect(user.id).toBeTruthy();
    expect(user.creadoEn).toBeInstanceOf(Date);
  });

  it('no permite correo vacío', () => {
    expect(() => User.create({ correo: ' ', passwordHash: 'hash' })).toThrow();
  });
});
