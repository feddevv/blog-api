import { describe, it, beforeEach, expect } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { createRandomUser } from '../utils/seedFactories.js';
import request from 'supertest';
import { app } from '../app.js';

describe('Authentication', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  describe('Registration', () => {
    it('should successfully register a new user', async () => {
      const { username, email, password } = createRandomUser();

      const response = await request(app)
        .post('/api/auth/register')
        .send({ username, email, password })
        .expect(201);

      expect(response.body).toEqual({ message: 'Created' });
    });

    it('should return an error when a user with this email already exists', async () => {
      const { email, password } = await prisma.user.create({
        data: { ...createRandomUser() },
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: 'New_user', email, password })
        .expect(409);

      expect(response.body).toEqual({ message: 'Username or email is already taken' });
    });

    it('should return an error when a user with this username already exists', async () => {
      const { username, password } = await prisma.user.create({
        data: { ...createRandomUser() },
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({ username, email: 'new_email@gmail.com', password })
        .expect(409);

      expect(response.body).toEqual({ message: 'Username or email is already taken' });
    });

    it('should return validation error when validation fails', async () => {
      const response = await request(app).post('/api/auth/register').send({}).expect(422);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('Login', () => {
    it('should successfully log a user in', async () => {
      const user = createRandomUser();

      await request(app)
        .post('/api/auth/register')
        .send({ username: user.username, email: user.email, password: user.password });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: user.username, password: user.password })
        .expect(200);

      expect(response.body).toHaveProperty('token');
    });

    it('should return an error when username is incorrect', async () => {
      const user = createRandomUser();

      await request(app)
        .post('/api/auth/register')
        .send({ username: user.username, email: user.email, password: user.password });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'incorrect_username', password: user.password })
        .expect(401);

      expect(response.body).toEqual({ message: 'Username or password is incorrect' });
    });

    it('should return an error when password is incorrect', async () => {
      const user = createRandomUser();

      await request(app)
        .post('/api/auth/register')
        .send({ username: user.username, email: user.email, password: user.password });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: user.username, password: 'incorrect_password' })
        .expect(401);

      expect(response.body).toEqual({ message: 'Username or password is incorrect' });
    });

    it('should attach a refresh token when successfully logged in', async () => {
      const user = createRandomUser();

      await request(app)
        .post('/api/auth/register')
        .send({ username: user.username, email: user.email, password: user.password });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: user.username, password: user.password })
        .expect(200);

      const hasHttpOnlyRefreshToken = response
        .get('Set-Cookie')
        ?.some((cookie) => cookie.includes('refreshToken') && cookie.includes('HttpOnly'));

      expect(hasHttpOnlyRefreshToken).toBe(true);
    });

    it("shouldn't attach a refresh token on login error", async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'incorrect_username', password: 'password' })
        .expect(401);

      const hasRefreshToken =
        response.get('Set-Cookie')?.some((cookie) => cookie.includes('refreshToken')) ?? false;

      expect(hasRefreshToken).toBe(false);
    });
  });

  describe('Me', () => {
    it('should successfully return user info', async () => {
      const user = createRandomUser();

      await request(app)
        .post('/api/auth/register')
        .send({ username: user.username, email: user.email, password: user.password });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ username: user.username, password: user.password });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${loginResponse.body.token}`)
        .expect(200);

      expect(response.body).toMatchObject({ username: user.username, email: user.email });
    });

    it('should return 401 error when access token is incorrect', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer incorrect_token')
        .expect(401);

      expect(response.body).toEqual({ message: 'Invalid or expired token' });
    });

    it('should return 401 error when access token is not set', async () => {
      const response = await request(app).get('/api/auth/me').expect(401);

      expect(response.body).toEqual({ message: 'Token not found or invalid format' });
    });
  });

  describe('Logout', () => {
    it('should successfully logout a user', async () => {
      const user = createRandomUser();

      await request(app)
        .post('/api/auth/register')
        .send({ username: user.username, email: user.email, password: user.password });

      await request(app)
        .post('/api/auth/login')
        .send({ username: user.username, password: user.password });

      const response = await request(app).post('/api/auth/logout').expect(200);

      const cookies = response.get('Set-Cookie') ?? [];
      const hasRefreshToken = cookies.some((cookie) => cookie.includes('refreshToken'));

      expect(hasRefreshToken).toBe(false);
      expect(response.body).toEqual({ message: 'Successfully logged out' });
    });

    it('should successfully logout a user even when refreshToken is not set', async () => {
      const response = await request(app).post('/api/auth/logout').expect(200);

      const cookies = response.get('Set-Cookie') ?? [];
      const hasRefreshToken = cookies.some((cookie) => cookie.includes('refreshToken'));

      expect(hasRefreshToken).toBe(false);
      expect(response.body).toEqual({ message: 'Successfully logged out' });
    });
  });

  describe('Refresh', () => {
    it('should successfully refresh access token and rotate refresh token', async () => {
      const user = createRandomUser();

      await request(app)
        .post('/api/auth/register')
        .send({ username: user.username, email: user.email, password: user.password });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ username: user.username, password: user.password });

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', loginResponse.headers['set-cookie'])
        .expect(200);

      expect(response.body).toHaveProperty('token');
    });

    it('should return an error when token is missing', async () => {
      const response = await request(app).post('/api/auth/refresh').expect(401);

      expect(response.body).toEqual({ message: 'Refresh token is missing' });
    });

    it('should return an error when token is invalid', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', ['refreshToken=invalid_token'])
        .expect(401);

      expect(response.body).toEqual({ message: 'Invalid or expired token' });
    });
  });
});
