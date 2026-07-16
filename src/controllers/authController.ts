import { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { hash, compare } from 'bcrypt';
import { HttpError } from '../errors/HttpError.js';
import { LoginBody, RegisterBody } from '../validation/schemas.js';
import jwt from 'jsonwebtoken';

type TypedRequestBody<T> = Request<unknown, unknown, T>;

export async function register(req: TypedRequestBody<RegisterBody>, res: Response) {
  const { username, email, password } = req.body;

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ username: username }, { email: email }],
    },
  });

  if (existingUser) {
    throw new HttpError(409, 'Username or email is already taken');
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

export async function login(req: TypedRequestBody<LoginBody>, res: Response) {
  const { username, password } = req.body;

  const secretKey = process.env.SECRET_KEY;
  if (!secretKey) {
    throw new Error('SECRET_KEY is not defined in environment variables');
  }

  const user = await prisma.user.findUnique({
    where: {
      username,
    },
  });

  if (!user) {
    throw new HttpError(401, 'Username or password is incorrect');
  }

  const isValidPassword = await compare(password, user.password);

  if (!isValidPassword) {
    throw new HttpError(401, 'Username or password is incorrect');
  }

  const token = jwt.sign({ id: user.id }, secretKey, { expiresIn: '1d' });

  res.json({ token });
}
