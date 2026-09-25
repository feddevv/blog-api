import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import request from 'supertest';
import { app } from '../app.js';
import { createTestUser, generateToken, createTestPost } from './testUtils.js';
import jwt from 'jsonwebtoken';

describe('Post Likes', () => {
  beforeEach(async () => {
    await prisma.postLike.deleteMany();
    await prisma.commentLike.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.post.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('POST /api/posts/:postId/likes (Toggle post like)', () => {
    describe('Happy Paths (Toggle Functionality)', () => {
      it('should successfully like a post when not currently liked by the user', async () => {
        const author = await createTestUser();
        const user = await createTestUser('USER');
        const token = generateToken(user.id, 'USER');
        const post = await createTestPost(author.id);

        const response = await request(app)
          .post(`/api/posts/${post.id}/likes`)
          .set('Authorization', `Bearer ${token}`)
          .expect(201);

        expect(response.body).toEqual({ message: 'Liked' });

        const likeInDb = await prisma.postLike.findUnique({
          where: {
            postId_userId: {
              postId: post.id,
              userId: user.id,
            },
          },
        });
        expect(likeInDb).not.toBeNull();
        expect(likeInDb?.postId).toBe(post.id);
        expect(likeInDb?.userId).toBe(user.id);
      });

      it('should successfully unlike a post when already liked by the user', async () => {
        const author = await createTestUser();
        const user = await createTestUser('USER');
        const token = generateToken(user.id, 'USER');
        const post = await createTestPost(author.id);

        await prisma.postLike.create({
          data: { postId: post.id, userId: user.id },
        });

        const response = await request(app)
          .post(`/api/posts/${post.id}/likes`)
          .set('Authorization', `Bearer ${token}`)
          .expect(201);

        expect(response.body).toEqual({ message: 'Unliked' });

        const likeInDb = await prisma.postLike.findUnique({
          where: {
            postId_userId: {
              postId: post.id,
              userId: user.id,
            },
          },
        });
        expect(likeInDb).toBeNull();
      });

      it('should toggle back to "Liked" on subsequent request after unliking', async () => {
        const user = await createTestUser('USER');
        const token = generateToken(user.id, 'USER');
        const post = await createTestPost(user.id);

        // 1. First request -> Like
        const firstResponse = await request(app)
          .post(`/api/posts/${post.id}/likes`)
          .set('Authorization', `Bearer ${token}`)
          .expect(201);
        expect(firstResponse.body).toEqual({ message: 'Liked' });

        // 2. Second request -> Unlike
        const secondResponse = await request(app)
          .post(`/api/posts/${post.id}/likes`)
          .set('Authorization', `Bearer ${token}`)
          .expect(201);
        expect(secondResponse.body).toEqual({ message: 'Unliked' });

        // 3. Third request -> Like again
        const thirdResponse = await request(app)
          .post(`/api/posts/${post.id}/likes`)
          .set('Authorization', `Bearer ${token}`)
          .expect(201);
        expect(thirdResponse.body).toEqual({ message: 'Liked' });

        const likeInDb = await prisma.postLike.findUnique({
          where: {
            postId_userId: {
              postId: post.id,
              userId: user.id,
            },
          },
        });
        expect(likeInDb).not.toBeNull();
      });

      it('should allow the post author to like their own post', async () => {
        const author = await createTestUser('USER');
        const token = generateToken(author.id, 'USER');
        const post = await createTestPost(author.id);

        const response = await request(app)
          .post(`/api/posts/${post.id}/likes`)
          .set('Authorization', `Bearer ${token}`)
          .expect(201);

        expect(response.body).toEqual({ message: 'Liked' });

        const likeInDb = await prisma.postLike.findUnique({
          where: {
            postId_userId: {
              postId: post.id,
              userId: author.id,
            },
          },
        });
        expect(likeInDb).not.toBeNull();
      });

      it('should allow users with different roles (USER, EDITOR, ADMIN) to like a post', async () => {
        const author = await createTestUser();
        const post = await createTestPost(author.id);

        const regularUser = await createTestUser('USER');
        const editorUser = await createTestUser('EDITOR');
        const adminUser = await createTestUser('ADMIN');

        const userToken = generateToken(regularUser.id, 'USER');
        const editorToken = generateToken(editorUser.id, 'EDITOR');
        const adminToken = generateToken(adminUser.id, 'ADMIN');

        await request(app)
          .post(`/api/posts/${post.id}/likes`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(201);

        await request(app)
          .post(`/api/posts/${post.id}/likes`)
          .set('Authorization', `Bearer ${editorToken}`)
          .expect(201);

        await request(app)
          .post(`/api/posts/${post.id}/likes`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(201);

        const totalLikes = await prisma.postLike.count({
          where: { postId: post.id },
        });
        expect(totalLikes).toBe(3);
      });

      it('should only unlike the post for the requesting user without affecting other users likes', async () => {
        const author = await createTestUser();
        const post = await createTestPost(author.id);

        const user1 = await createTestUser();
        const user2 = await createTestUser();
        const token1 = generateToken(user1.id, 'USER');

        await prisma.postLike.create({
          data: { postId: post.id, userId: user1.id },
        });
        await prisma.postLike.create({
          data: { postId: post.id, userId: user2.id },
        });

        const response = await request(app)
          .post(`/api/posts/${post.id}/likes`)
          .set('Authorization', `Bearer ${token1}`)
          .expect(201);

        expect(response.body).toEqual({ message: 'Unliked' });

        const user1Like = await prisma.postLike.findUnique({
          where: {
            postId_userId: {
              postId: post.id,
              userId: user1.id,
            },
          },
        });
        expect(user1Like).toBeNull();

        const user2Like = await prisma.postLike.findUnique({
          where: {
            postId_userId: {
              postId: post.id,
              userId: user2.id,
            },
          },
        });
        expect(user2Like).not.toBeNull();
      });

      it('should only toggle like on the target post without affecting likes on other posts', async () => {
        const user = await createTestUser();
        const token = generateToken(user.id, 'USER');

        const post1 = await createTestPost(user.id);
        const post2 = await createTestPost(user.id);

        await prisma.postLike.create({
          data: { postId: post1.id, userId: user.id },
        });
        await prisma.postLike.create({
          data: { postId: post2.id, userId: user.id },
        });

        const response = await request(app)
          .post(`/api/posts/${post1.id}/likes`)
          .set('Authorization', `Bearer ${token}`)
          .expect(201);

        expect(response.body).toEqual({ message: 'Unliked' });

        const post1Like = await prisma.postLike.findUnique({
          where: {
            postId_userId: {
              postId: post1.id,
              userId: user.id,
            },
          },
        });
        expect(post1Like).toBeNull();

        const post2Like = await prisma.postLike.findUnique({
          where: {
            postId_userId: {
              postId: post2.id,
              userId: user.id,
            },
          },
        });
        expect(post2Like).not.toBeNull();
      });
    });

    describe('Failure Paths (404 Not Found)', () => {
      it('should return 404 when the post does not exist', async () => {
        const user = await createTestUser();
        const token = generateToken(user.id, 'USER');

        const response = await request(app)
          .post('/api/posts/999999/likes')
          .set('Authorization', `Bearer ${token}`)
          .expect(404);

        expect(response.body).toEqual({ message: 'Post not found' });

        const likesCount = await prisma.postLike.count();
        expect(likesCount).toBe(0);
      });
    });

    describe('Failure Paths (401 Unauthorized)', () => {
      it('should return 401 when Authorization header is missing', async () => {
        const user = await createTestUser();
        const post = await createTestPost(user.id);

        const response = await request(app).post(`/api/posts/${post.id}/likes`).expect(401);

        expect(response.body).toEqual({ message: 'Token not found or invalid format' });

        const likesCount = await prisma.postLike.count();
        expect(likesCount).toBe(0);
      });

      it('should return 401 when Authorization header does not start with Bearer', async () => {
        const user = await createTestUser();
        const token = generateToken(user.id, 'USER');
        const post = await createTestPost(user.id);

        const response = await request(app)
          .post(`/api/posts/${post.id}/likes`)
          .set('Authorization', `Basic ${token}`)
          .expect(401);

        expect(response.body).toEqual({ message: 'Token not found or invalid format' });
      });

      it('should return 401 when token is invalid', async () => {
        const user = await createTestUser();
        const post = await createTestPost(user.id);

        const response = await request(app)
          .post(`/api/posts/${post.id}/likes`)
          .set('Authorization', 'Bearer invalid_or_corrupted_token')
          .expect(401);

        expect(response.body).toEqual({ message: 'Invalid or expired token' });
      });

      it('should return 401 when token is expired', async () => {
        const user = await createTestUser();
        const post = await createTestPost(user.id);

        const secretKey = process.env.SECRET_KEY!;
        const expiredToken = jwt.sign({ id: user.id, role: 'USER' }, secretKey, {
          expiresIn: '-1s',
        });

        const response = await request(app)
          .post(`/api/posts/${post.id}/likes`)
          .set('Authorization', `Bearer ${expiredToken}`)
          .expect(401);

        expect(response.body).toEqual({ message: 'Invalid or expired token' });
      });
    });
  });
});
