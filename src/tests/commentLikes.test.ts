import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import request from 'supertest';
import { app } from '../app.js';
import { createTestUser, generateToken, createTestPost } from './testUtils.js';
import { createRandomComment } from '../utils/seedFactories.js';
import jwt from 'jsonwebtoken';

describe('Comment Likes', () => {
  beforeEach(async () => {
    await prisma.commentLike.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.postLike.deleteMany();
    await prisma.post.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('POST /api/comments/:commentId/likes (Toggle comment like)', () => {
    describe('Happy Paths (Toggle Functionality)', () => {
      it('should successfully like a comment when not currently liked by the user', async () => {
        const author = await createTestUser();
        const user = await createTestUser('USER');
        const token = generateToken(user.id, 'USER');
        const post = await createTestPost(author.id);
        const comment = await prisma.comment.create({
          data: createRandomComment({ userId: author.id, postId: post.id }),
        });

        const response = await request(app)
          .post(`/api/comments/${comment.id}/likes`)
          .set('Authorization', `Bearer ${token}`)
          .expect(201);

        expect(response.body).toEqual({ message: 'Liked' });

        const likeInDb = await prisma.commentLike.findUnique({
          where: {
            commentId_userId: {
              commentId: comment.id,
              userId: user.id,
            },
          },
        });
        expect(likeInDb).not.toBeNull();
        expect(likeInDb?.commentId).toBe(comment.id);
        expect(likeInDb?.userId).toBe(user.id);
      });

      it('should successfully unlike a comment when already liked by the user', async () => {
        const author = await createTestUser();
        const user = await createTestUser('USER');
        const token = generateToken(user.id, 'USER');
        const post = await createTestPost(author.id);
        const comment = await prisma.comment.create({
          data: createRandomComment({ userId: author.id, postId: post.id }),
        });

        await prisma.commentLike.create({
          data: { commentId: comment.id, userId: user.id },
        });

        const response = await request(app)
          .post(`/api/comments/${comment.id}/likes`)
          .set('Authorization', `Bearer ${token}`)
          .expect(201);

        expect(response.body).toEqual({ message: 'Unliked' });

        const likeInDb = await prisma.commentLike.findUnique({
          where: {
            commentId_userId: {
              commentId: comment.id,
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
        const comment = await prisma.comment.create({
          data: createRandomComment({ userId: user.id, postId: post.id }),
        });

        // 1. First request -> Like
        const firstResponse = await request(app)
          .post(`/api/comments/${comment.id}/likes`)
          .set('Authorization', `Bearer ${token}`)
          .expect(201);
        expect(firstResponse.body).toEqual({ message: 'Liked' });

        // 2. Second request -> Unlike
        const secondResponse = await request(app)
          .post(`/api/comments/${comment.id}/likes`)
          .set('Authorization', `Bearer ${token}`)
          .expect(201);
        expect(secondResponse.body).toEqual({ message: 'Unliked' });

        // 3. Third request -> Like again
        const thirdResponse = await request(app)
          .post(`/api/comments/${comment.id}/likes`)
          .set('Authorization', `Bearer ${token}`)
          .expect(201);
        expect(thirdResponse.body).toEqual({ message: 'Liked' });

        const likeInDb = await prisma.commentLike.findUnique({
          where: {
            commentId_userId: {
              commentId: comment.id,
              userId: user.id,
            },
          },
        });
        expect(likeInDb).not.toBeNull();
      });

      it('should allow the comment author to like their own comment', async () => {
        const author = await createTestUser('USER');
        const token = generateToken(author.id, 'USER');
        const post = await createTestPost(author.id);
        const comment = await prisma.comment.create({
          data: createRandomComment({ userId: author.id, postId: post.id }),
        });

        const response = await request(app)
          .post(`/api/comments/${comment.id}/likes`)
          .set('Authorization', `Bearer ${token}`)
          .expect(201);

        expect(response.body).toEqual({ message: 'Liked' });

        const likeInDb = await prisma.commentLike.findUnique({
          where: {
            commentId_userId: {
              commentId: comment.id,
              userId: author.id,
            },
          },
        });
        expect(likeInDb).not.toBeNull();
      });

      it('should allow users with different roles (USER, EDITOR, ADMIN) to like a comment', async () => {
        const author = await createTestUser();
        const post = await createTestPost(author.id);
        const comment = await prisma.comment.create({
          data: createRandomComment({ userId: author.id, postId: post.id }),
        });

        const regularUser = await createTestUser('USER');
        const editorUser = await createTestUser('EDITOR');
        const adminUser = await createTestUser('ADMIN');

        const userToken = generateToken(regularUser.id, 'USER');
        const editorToken = generateToken(editorUser.id, 'EDITOR');
        const adminToken = generateToken(adminUser.id, 'ADMIN');

        await request(app)
          .post(`/api/comments/${comment.id}/likes`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(201);

        await request(app)
          .post(`/api/comments/${comment.id}/likes`)
          .set('Authorization', `Bearer ${editorToken}`)
          .expect(201);

        await request(app)
          .post(`/api/comments/${comment.id}/likes`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(201);

        const totalLikes = await prisma.commentLike.count({
          where: { commentId: comment.id },
        });
        expect(totalLikes).toBe(3);
      });

      it('should only unlike the comment for the requesting user without affecting other users likes', async () => {
        const author = await createTestUser();
        const post = await createTestPost(author.id);
        const comment = await prisma.comment.create({
          data: createRandomComment({ userId: author.id, postId: post.id }),
        });

        const user1 = await createTestUser();
        const user2 = await createTestUser();
        const token1 = generateToken(user1.id, 'USER');

        await prisma.commentLike.create({
          data: { commentId: comment.id, userId: user1.id },
        });
        await prisma.commentLike.create({
          data: { commentId: comment.id, userId: user2.id },
        });

        const response = await request(app)
          .post(`/api/comments/${comment.id}/likes`)
          .set('Authorization', `Bearer ${token1}`)
          .expect(201);

        expect(response.body).toEqual({ message: 'Unliked' });

        const user1Like = await prisma.commentLike.findUnique({
          where: {
            commentId_userId: {
              commentId: comment.id,
              userId: user1.id,
            },
          },
        });
        expect(user1Like).toBeNull();

        const user2Like = await prisma.commentLike.findUnique({
          where: {
            commentId_userId: {
              commentId: comment.id,
              userId: user2.id,
            },
          },
        });
        expect(user2Like).not.toBeNull();
      });

      it('should only toggle like on the target comment without affecting likes on other comments', async () => {
        const user = await createTestUser();
        const token = generateToken(user.id, 'USER');

        const post = await createTestPost(user.id);
        const comment1 = await prisma.comment.create({
          data: createRandomComment({ userId: user.id, postId: post.id }),
        });
        const comment2 = await prisma.comment.create({
          data: createRandomComment({ userId: user.id, postId: post.id }),
        });

        await prisma.commentLike.create({
          data: { commentId: comment1.id, userId: user.id },
        });
        await prisma.commentLike.create({
          data: { commentId: comment2.id, userId: user.id },
        });

        const response = await request(app)
          .post(`/api/comments/${comment1.id}/likes`)
          .set('Authorization', `Bearer ${token}`)
          .expect(201);

        expect(response.body).toEqual({ message: 'Unliked' });

        const comment1Like = await prisma.commentLike.findUnique({
          where: {
            commentId_userId: {
              commentId: comment1.id,
              userId: user.id,
            },
          },
        });
        expect(comment1Like).toBeNull();

        const comment2Like = await prisma.commentLike.findUnique({
          where: {
            commentId_userId: {
              commentId: comment2.id,
              userId: user.id,
            },
          },
        });
        expect(comment2Like).not.toBeNull();
      });
    });

    describe('Failure Paths (404 Not Found)', () => {
      it('should return 404 when the comment does not exist', async () => {
        const user = await createTestUser();
        const token = generateToken(user.id, 'USER');

        const response = await request(app)
          .post('/api/comments/999999/likes')
          .set('Authorization', `Bearer ${token}`)
          .expect(404);

        expect(response.body).toEqual({ message: 'Comment not found' });

        const likesCount = await prisma.commentLike.count();
        expect(likesCount).toBe(0);
      });
    });

    describe('Failure Paths (401 Unauthorized)', () => {
      it('should return 401 when Authorization header is missing', async () => {
        const user = await createTestUser();
        const post = await createTestPost(user.id);
        const comment = await prisma.comment.create({
          data: createRandomComment({ userId: user.id, postId: post.id }),
        });

        const response = await request(app).post(`/api/comments/${comment.id}/likes`).expect(401);

        expect(response.body).toEqual({ message: 'Token not found or invalid format' });

        const likesCount = await prisma.commentLike.count();
        expect(likesCount).toBe(0);
      });

      it('should return 401 when Authorization header does not start with Bearer', async () => {
        const user = await createTestUser();
        const token = generateToken(user.id, 'USER');
        const post = await createTestPost(user.id);
        const comment = await prisma.comment.create({
          data: createRandomComment({ userId: user.id, postId: post.id }),
        });

        const response = await request(app)
          .post(`/api/comments/${comment.id}/likes`)
          .set('Authorization', `Basic ${token}`)
          .expect(401);

        expect(response.body).toEqual({ message: 'Token not found or invalid format' });
      });

      it('should return 401 when token is invalid', async () => {
        const user = await createTestUser();
        const post = await createTestPost(user.id);
        const comment = await prisma.comment.create({
          data: createRandomComment({ userId: user.id, postId: post.id }),
        });

        const response = await request(app)
          .post(`/api/comments/${comment.id}/likes`)
          .set('Authorization', 'Bearer invalid_or_corrupted_token')
          .expect(401);

        expect(response.body).toEqual({ message: 'Invalid or expired token' });
      });

      it('should return 401 when token is expired', async () => {
        const user = await createTestUser();
        const post = await createTestPost(user.id);
        const comment = await prisma.comment.create({
          data: createRandomComment({ userId: user.id, postId: post.id }),
        });

        const secretKey = process.env.SECRET_KEY!;
        const expiredToken = jwt.sign({ id: user.id, role: 'USER' }, secretKey, {
          expiresIn: '-1s',
        });

        const response = await request(app)
          .post(`/api/comments/${comment.id}/likes`)
          .set('Authorization', `Bearer ${expiredToken}`)
          .expect(401);

        expect(response.body).toEqual({ message: 'Invalid or expired token' });
      });
    });
  });
});
