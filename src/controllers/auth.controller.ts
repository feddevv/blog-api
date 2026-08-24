import { Request, Response } from 'express';
import { LoginBody, RegisterBody } from '../validation/authSchemas.js';
import { AuthenticatedRequest } from '../types/types.js';
import * as authService from '../services/auth.service.js';

export async function register(
  req: AuthenticatedRequest<unknown, unknown, RegisterBody>,
  res: Response,
) {
  const { username, email, password } = req.body;

  await authService.registerUser(username, email, password);

  res.status(201).json({ message: 'Created' });
}

export async function login(req: AuthenticatedRequest<unknown, unknown, LoginBody>, res: Response) {
  const { username, password } = req.body;

  const accessToken = await authService.loginUser(username, password, res);

  res.json({ token: accessToken });
}

export async function me(req: AuthenticatedRequest, res: Response) {
  const { id } = req.user!;

  const user = await authService.getUserById(id);

  res.json(user);
}

export async function refresh(req: Request, res: Response) {
  const refreshToken = req.cookies.refreshToken;

  const newAccessToken = await authService. refreshAccessToken(refreshToken, res);

  res.json({ token: newAccessToken });
}

export async function logout(req: Request, res: Response) {
  const refreshToken = req.cookies.refreshToken as string;

  await authService.logoutUser(refreshToken, res);

  res.json({ message: 'Successfully logged out' });
}
