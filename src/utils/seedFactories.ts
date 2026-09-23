import { User } from '../generated/prisma/client.js';

export function createRandomUser(): Omit<User, 'id'> {
  return {
    username: `user-${Date.now()}`,
    email: `user-${Date.now()}@gmail.com`,
    password: crypto.randomUUID(),
    role: 'USER',
  };
}
