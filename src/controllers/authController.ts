import { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { hash } from 'bcrypt';

interface RegisterBody {
  username: string;
  email: string;
  password: string;
}

type TypedRequestBody<T> = Request<unknown, unknown, T>;

export async function register(req: TypedRequestBody<RegisterBody>, res: Response) {
  const { username, email, password } = req.body;

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ username: username }, { email: email }],
    },
  });

  if (existingUser) {
    return res.sendStatus(409);
  }

  const hashedPassword = await hash(password, 10);

  await prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
    },
  });

  res.sendStatus(201);
}
