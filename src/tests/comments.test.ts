import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { createRandomComment } from '../utils/seedFactories.js';
import request from 'supertest';
import { app } from '../app.js';
import { createTestUser, generateToken, createTestPost } from './testUtils.js';

describe('Comments', () => {
  beforeEach(async () => {
    await prisma.commentLike.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.postLike.deleteMany();
    await prisma.post.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('GET /api/posts/:postId/comments (Get post comments)', () => {
    it('should return paginated comments with default page and size when no query params are provided', async () => {
      const user = await createTestUser();
      const post = await createTestPost(user.id);

      const commentsData = Array.from({ length: 12 }, () =>
        createRandomComment({ userId: user.id, postId: post.id }),
      );
      await prisma.comment.createMany({ data: commentsData });

      const response = await request(app).get(`/api/posts/${post.id}/comments`).expect(200);

      expect(response.body.data).toHaveLength(10);
      expect(response.body.totalCount).toBe(12);
      expect(response.body.pageSize).toBe(10);
      expect(response.body.currentPage).toBe(1);
    });

    it('should return empty list and correct pagination metadata when post has no comments', async () => {
      const user = await createTestUser();
      const post = await createTestPost(user.id);

      const response = await request(app).get(`/api/posts/${post.id}/comments`).expect(200);

      expect(response.body.data).toEqual([]);
      expect(response.body.totalCount).toBe(0);
      expect(response.body.pageSize).toBe(10);
      expect(response.body.currentPage).toBe(1);
    });

    it('should include author username in user object for each comment', async () => {
      const user = await createTestUser();
      const post = await createTestPost(user.id);

      const comment = await prisma.comment.create({
        data: createRandomComment({ userId: user.id, postId: post.id }),
      });

      const response = await request(app).get(`/api/posts/${post.id}/comments`).expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(comment.id);
      expect(response.body.data[0].user).toEqual({ username: user.username });
    });

    it('should filter comments by search query matching comment content case-insensitively', async () => {
      const user = await createTestUser();
      const post = await createTestPost(user.id);

      const comment1 = await prisma.comment.create({
        data: createRandomComment({
          userId: user.id,
          postId: post.id,
          content: 'I really love TypeScript with Express',
        }),
      });
      const comment2 = await prisma.comment.create({
        data: createRandomComment({
          userId: user.id,
          postId: post.id,
          content: 'TYPESCRIPT makes backend development robust',
        }),
      });
      await prisma.comment.create({
        data: createRandomComment({
          userId: user.id,
          postId: post.id,
          content: 'Unrelated comment about cooking recipes',
        }),
      });

      const response = await request(app)
        .get(`/api/posts/${post.id}/comments`)
        .query({ search: 'typescript' })
        .expect(200);

      expect(response.body.totalCount).toBe(2);
      expect(response.body.data).toHaveLength(2);
      const returnedIds = response.body.data.map((c: { id: number }) => c.id);
      expect(returnedIds).toEqual(expect.arrayContaining([comment1.id, comment2.id]));
    });

    it('should return empty list when search term matches no comments', async () => {
      const user = await createTestUser();
      const post = await createTestPost(user.id);

      await prisma.comment.create({
        data: createRandomComment({ userId: user.id, postId: post.id, content: 'Some comment' }),
      });

      const response = await request(app)
        .get(`/api/posts/${post.id}/comments`)
        .query({ search: 'nonexistent-search-term-12345' })
        .expect(200);

      expect(response.body.totalCount).toBe(0);
      expect(response.body.data).toEqual([]);
    });

    it('should return isLiked: false and likesCount: 0 for unauthenticated requests', async () => {
      const user = await createTestUser();
      const post = await createTestPost(user.id);

      await prisma.comment.create({
        data: createRandomComment({ userId: user.id, postId: post.id }),
      });

      const response = await request(app).get(`/api/posts/${post.id}/comments`).expect(200);

      expect(response.body.data[0].isLiked).toBe(false);
      expect(response.body.data[0].likesCount).toBe(0);
    });

    it('should include correct isLiked: true and likesCount for authenticated user', async () => {
      const author = await createTestUser();
      const reader = await createTestUser();
      const token = generateToken(reader.id, 'USER');

      const post = await createTestPost(author.id);
      const comment = await prisma.comment.create({
        data: createRandomComment({ userId: author.id, postId: post.id }),
      });

      await prisma.commentLike.create({
        data: { commentId: comment.id, userId: reader.id },
      });

      const response = await request(app)
        .get(`/api/posts/${post.id}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data[0].id).toBe(comment.id);
      expect(response.body.data[0].isLiked).toBe(true);
      expect(response.body.data[0].likesCount).toBe(1);
    });

    it('should include correct isLiked: false when authenticated user has not liked the comment', async () => {
      const author = await createTestUser();
      const liker = await createTestUser();
      const reader = await createTestUser();
      const token = generateToken(reader.id, 'USER');

      const post = await createTestPost(author.id);
      const comment = await prisma.comment.create({
        data: createRandomComment({ userId: author.id, postId: post.id }),
      });

      await prisma.commentLike.create({
        data: { commentId: comment.id, userId: liker.id },
      });

      const response = await request(app)
        .get(`/api/posts/${post.id}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data[0].id).toBe(comment.id);
      expect(response.body.data[0].isLiked).toBe(false);
      expect(response.body.data[0].likesCount).toBe(1);
    });

    it('should return 403 Forbidden when unauthenticated user requests comments on a DRAFT post', async () => {
      const user = await createTestUser();
      const post = await createTestPost(user.id, 'DRAFT');

      const response = await request(app).get(`/api/posts/${post.id}/comments`).expect(403);

      expect(response.body).toEqual({ message: 'Forbidden: Admin access required' });
    });

    it('should return 403 Forbidden when unauthenticated user requests comments on a HIDDEN post', async () => {
      const user = await createTestUser();
      const post = await createTestPost(user.id, 'HIDDEN');

      const response = await request(app).get(`/api/posts/${post.id}/comments`).expect(403);

      expect(response.body).toEqual({ message: 'Forbidden: Admin access required' });
    });

    it('should return 403 Forbidden when regular USER requests comments on a DRAFT post', async () => {
      const user = await createTestUser('USER');
      const token = generateToken(user.id, 'USER');

      const author = await createTestUser();
      const post = await createTestPost(author.id, 'DRAFT');

      const response = await request(app)
        .get(`/api/posts/${post.id}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body).toEqual({ message: 'Forbidden: Admin access required' });
    });

    it('should return 403 Forbidden when EDITOR requests comments on a DRAFT post', async () => {
      const editor = await createTestUser('EDITOR');
      const token = generateToken(editor.id, 'EDITOR');

      const author = await createTestUser();
      const post = await createTestPost(author.id, 'DRAFT');

      const response = await request(app)
        .get(`/api/posts/${post.id}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body).toEqual({ message: 'Forbidden: Admin access required' });
    });

    it('should successfully return comments of a DRAFT post when requested by an ADMIN', async () => {
      const admin = await createTestUser('ADMIN');
      const token = generateToken(admin.id, 'ADMIN');

      const post = await createTestPost(admin.id, 'DRAFT');
      const comment = await prisma.comment.create({
        data: createRandomComment({ userId: admin.id, postId: post.id }),
      });

      const response = await request(app)
        .get(`/api/posts/${post.id}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.totalCount).toBe(1);
      expect(response.body.data[0].id).toBe(comment.id);
    });

    it('should successfully return comments of a HIDDEN post when requested by an ADMIN', async () => {
      const admin = await createTestUser('ADMIN');
      const token = generateToken(admin.id, 'ADMIN');

      const post = await createTestPost(admin.id, 'HIDDEN');
      const comment = await prisma.comment.create({
        data: createRandomComment({ userId: admin.id, postId: post.id }),
      });

      const response = await request(app)
        .get(`/api/posts/${post.id}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.totalCount).toBe(1);
      expect(response.body.data[0].id).toBe(comment.id);
    });

    it('should return 404 when post does not exist', async () => {
      const response = await request(app).get('/api/posts/999999/comments').expect(404);

      expect(response.body).toEqual({ message: 'Post not found' });
    });

    it('should return 422 when postId parameter is not a valid positive integer', async () => {
      const response = await request(app).get('/api/posts/invalid-id/comments').expect(422);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.message).toBe('Validation failed');
    });

    it('should return 401 when Authorization header has an invalid token', async () => {
      const user = await createTestUser();
      const post = await createTestPost(user.id);

      const response = await request(app)
        .get(`/api/posts/${post.id}/comments`)
        .set('Authorization', 'Bearer invalid_token_123')
        .expect(401);

      expect(response.body).toEqual({ message: 'Invalid or expired token' });
    });
  });

  describe('POST /api/posts/:postId/comments (Create comment)', () => {
    it('should successfully create a comment on an existing post as an authenticated user', async () => {
      const author = await createTestUser();
      const commenter = await createTestUser('USER');
      const token = generateToken(commenter.id, 'USER');

      const post = await createTestPost(author.id);

      const commentContent = 'This is an awesome blog post!';

      const response = await request(app)
        .post(`/api/posts/${post.id}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: commentContent })
        .expect(200);

      expect(response.body).toMatchObject({
        content: commentContent,
        userId: commenter.id,
        postId: post.id,
      });
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');

      const commentInDb = await prisma.comment.findUnique({
        where: { id: response.body.id },
      });
      expect(commentInDb).not.toBeNull();
      expect(commentInDb?.content).toBe(commentContent);
      expect(commentInDb?.userId).toBe(commenter.id);
      expect(commentInDb?.postId).toBe(post.id);
    });

    it('should trim whitespace from comment content upon creation', async () => {
      const user = await createTestUser();
      const token = generateToken(user.id, 'USER');
      const post = await createTestPost(user.id);

      const response = await request(app)
        .post(`/api/posts/${post.id}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: '   Comment with extra padding   ' })
        .expect(200);

      expect(response.body.content).toBe('Comment with extra padding');

      const commentInDb = await prisma.comment.findUnique({
        where: { id: response.body.id },
      });
      expect(commentInDb?.content).toBe('Comment with extra padding');
    });

    it('should successfully create a comment as an ADMIN user', async () => {
      const admin = await createTestUser('ADMIN');
      const token = generateToken(admin.id, 'ADMIN');
      const post = await createTestPost(admin.id);

      const response = await request(app)
        .post(`/api/posts/${post.id}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Admin feedback comment' })
        .expect(200);

      expect(response.body.content).toBe('Admin feedback comment');
      expect(response.body.userId).toBe(admin.id);
    });

    it('should return 401 Unauthorized when token is missing', async () => {
      const user = await createTestUser();
      const post = await createTestPost(user.id);

      const response = await request(app)
        .post(`/api/posts/${post.id}/comments`)
        .send({ content: 'Unauthenticated comment' })
        .expect(401);

      expect(response.body).toEqual({ message: 'Token not found or invalid format' });
    });

    it('should return 401 Unauthorized when token is invalid', async () => {
      const user = await createTestUser();
      const post = await createTestPost(user.id);

      const response = await request(app)
        .post(`/api/posts/${post.id}/comments`)
        .set('Authorization', 'Bearer invalid_token')
        .send({ content: 'Invalid token comment' })
        .expect(401);

      expect(response.body).toEqual({ message: 'Invalid or expired token' });
    });

    it('should return 404 when post does not exist', async () => {
      const user = await createTestUser();
      const token = generateToken(user.id, 'USER');

      const response = await request(app)
        .post('/api/posts/999999/comments')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Comment on non-existent post' })
        .expect(404);

      expect(response.body).toEqual({ message: 'Post not found' });
    });

    it('should return 422 when postId parameter is invalid', async () => {
      const user = await createTestUser();
      const token = generateToken(user.id, 'USER');

      const response = await request(app)
        .post('/api/posts/invalid-id/comments')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Valid comment content' })
        .expect(422);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.message).toBe('Validation failed');
    });

    it('should return 422 when content field is missing from request body', async () => {
      const user = await createTestUser();
      const token = generateToken(user.id, 'USER');
      const post = await createTestPost(user.id);

      const response = await request(app)
        .post(`/api/posts/${post.id}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(422);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.message).toBe('Validation failed');
    });

    it('should return 422 when content is empty or contains only whitespace', async () => {
      const user = await createTestUser();
      const token = generateToken(user.id, 'USER');
      const post = await createTestPost(user.id);

      const response = await request(app)
        .post(`/api/posts/${post.id}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: '   ' })
        .expect(422);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.message).toBe('Validation failed');
    });

    it('should return 422 when content exceeds 400 characters', async () => {
      const user = await createTestUser();
      const token = generateToken(user.id, 'USER');
      const post = await createTestPost(user.id);

      const longContent = 'a'.repeat(401);

      const response = await request(app)
        .post(`/api/posts/${post.id}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: longContent })
        .expect(422);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.message).toBe('Validation failed');
    });

    it('should return 422 when content is not a string', async () => {
      const user = await createTestUser();
      const token = generateToken(user.id, 'USER');
      const post = await createTestPost(user.id);

      const response = await request(app)
        .post(`/api/posts/${post.id}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 12345 })
        .expect(422);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('GET /api/comments/:commentId (Get comment by ID)', () => {
    it('should successfully return a comment by ID for a published post', async () => {
      const user = await createTestUser();
      const post = await createTestPost(user.id, 'PUBLISHED');

      const comment = await prisma.comment.create({
        data: createRandomComment({
          userId: user.id,
          postId: post.id,
          content: 'Detailed comment content',
        }),
      });

      const response = await request(app).get(`/api/comments/${comment.id}`).expect(200);

      expect(response.body).toMatchObject({
        id: comment.id,
        content: 'Detailed comment content',
        postId: post.id,
        userId: user.id,
        likesCount: 0,
        isLiked: false,
      });
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should return isLiked: true and correct likesCount when requesting user has liked the comment', async () => {
      const author = await createTestUser();
      const reader = await createTestUser();
      const token = generateToken(reader.id, 'USER');

      const post = await createTestPost(author.id, 'PUBLISHED');
      const comment = await prisma.comment.create({
        data: createRandomComment({ userId: author.id, postId: post.id }),
      });

      await prisma.commentLike.create({
        data: { commentId: comment.id, userId: reader.id },
      });

      const response = await request(app)
        .get(`/api/comments/${comment.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.isLiked).toBe(true);
      expect(response.body.likesCount).toBe(1);
    });

    it('should return isLiked: false when requesting user has not liked the comment', async () => {
      const author = await createTestUser();
      const otherUser = await createTestUser();
      const reader = await createTestUser();
      const token = generateToken(reader.id, 'USER');

      const post = await createTestPost(author.id, 'PUBLISHED');
      const comment = await prisma.comment.create({
        data: createRandomComment({ userId: author.id, postId: post.id }),
      });

      await prisma.commentLike.create({
        data: { commentId: comment.id, userId: otherUser.id },
      });

      const response = await request(app)
        .get(`/api/comments/${comment.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.isLiked).toBe(false);
      expect(response.body.likesCount).toBe(1);
    });

    it('should return 404 when comment does not exist', async () => {
      const response = await request(app).get('/api/comments/999999').expect(404);

      expect(response.body).toEqual({ message: 'Comment not found' });
    });

    it('should return 404 when comment belongs to a DRAFT post', async () => {
      const user = await createTestUser();
      const draftPost = await createTestPost(user.id, 'DRAFT');

      const comment = await prisma.comment.create({
        data: createRandomComment({ userId: user.id, postId: draftPost.id }),
      });

      const response = await request(app).get(`/api/comments/${comment.id}`).expect(404);

      expect(response.body).toEqual({ message: 'Comment not found' });
    });

    it('should return 404 when comment belongs to a HIDDEN post', async () => {
      const user = await createTestUser();
      const hiddenPost = await createTestPost(user.id, 'HIDDEN');

      const comment = await prisma.comment.create({
        data: createRandomComment({ userId: user.id, postId: hiddenPost.id }),
      });

      const response = await request(app).get(`/api/comments/${comment.id}`).expect(404);

      expect(response.body).toEqual({ message: 'Comment not found' });
    });

    it('should return 422 when commentId parameter is invalid', async () => {
      const response = await request(app).get('/api/comments/invalid-id').expect(422);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.message).toBe('Validation failed');
    });

    it('should return 401 when Authorization header contains an invalid token', async () => {
      const user = await createTestUser();
      const post = await createTestPost(user.id, 'PUBLISHED');

      const comment = await prisma.comment.create({
        data: createRandomComment({ userId: user.id, postId: post.id }),
      });

      const response = await request(app)
        .get(`/api/comments/${comment.id}`)
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body).toEqual({ message: 'Invalid or expired token' });
    });
  });

  describe('PUT /api/comments/:commentId (Update comment)', () => {
    it('should successfully update comment content as the comment author', async () => {
      const author = await createTestUser('USER');
      const token = generateToken(author.id, 'USER');

      const post = await createTestPost(author.id);
      const comment = await prisma.comment.create({
        data: createRandomComment({
          userId: author.id,
          postId: post.id,
          content: 'Original comment text',
        }),
      });

      const updatedText = 'Updated comment text by author';

      const response = await request(app)
        .put(`/api/comments/${comment.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: updatedText })
        .expect(200);

      expect(response.body).toMatchObject({
        id: comment.id,
        content: updatedText,
        userId: author.id,
        postId: post.id,
      });

      const updatedInDb = await prisma.comment.findUnique({
        where: { id: comment.id },
      });
      expect(updatedInDb?.content).toBe(updatedText);
    });

    it('should successfully update comment content as an ADMIN (not the author)', async () => {
      const author = await createTestUser('USER');
      const admin = await createTestUser('ADMIN');
      const token = generateToken(admin.id, 'ADMIN');

      const post = await createTestPost(author.id);
      const comment = await prisma.comment.create({
        data: createRandomComment({
          userId: author.id,
          postId: post.id,
          content: 'Original comment text',
        }),
      });

      const adminUpdatedText = 'Moderated by admin';

      const response = await request(app)
        .put(`/api/comments/${comment.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: adminUpdatedText })
        .expect(200);

      expect(response.body).toMatchObject({
        id: comment.id,
        content: adminUpdatedText,
        userId: author.id,
        postId: post.id,
      });

      const updatedInDb = await prisma.comment.findUnique({
        where: { id: comment.id },
      });
      expect(updatedInDb?.content).toBe(adminUpdatedText);
    });

    it('should return 401 when token is missing', async () => {
      const user = await createTestUser();
      const post = await createTestPost(user.id);
      const comment = await prisma.comment.create({
        data: createRandomComment({ userId: user.id, postId: post.id }),
      });

      const response = await request(app)
        .put(`/api/comments/${comment.id}`)
        .send({ content: 'Unauthorized update attempt' })
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
        .put(`/api/comments/${comment.id}`)
        .set('Authorization', 'Bearer invalid_token')
        .send({ content: 'Invalid token update' })
        .expect(401);

      expect(response.body).toEqual({ message: 'Invalid or expired token' });
    });

    it("should return 403 Forbidden when a regular user tries to update another user's comment", async () => {
      const author = await createTestUser('USER');
      const otherUser = await createTestUser('USER');
      const otherUserToken = generateToken(otherUser.id, 'USER');

      const post = await createTestPost(author.id);
      const comment = await prisma.comment.create({
        data: createRandomComment({
          userId: author.id,
          postId: post.id,
          content: 'Author comment',
        }),
      });

      const response = await request(app)
        .put(`/api/comments/${comment.id}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ content: 'Malicious update attempt' })
        .expect(403);

      expect(response.body).toEqual({ message: "You don't have access to update this comment" });

      const commentInDb = await prisma.comment.findUnique({
        where: { id: comment.id },
      });
      expect(commentInDb?.content).toBe('Author comment');
    });

    it("should return 403 Forbidden when an EDITOR tries to update another user's comment", async () => {
      const author = await createTestUser('USER');
      const editor = await createTestUser('EDITOR');
      const editorToken = generateToken(editor.id, 'EDITOR');

      const post = await createTestPost(author.id);
      const comment = await prisma.comment.create({
        data: createRandomComment({
          userId: author.id,
          postId: post.id,
          content: 'Author comment',
        }),
      });

      const response = await request(app)
        .put(`/api/comments/${comment.id}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ content: 'Editor attempting update' })
        .expect(403);

      expect(response.body).toEqual({ message: "You don't have access to update this comment" });

      const commentInDb = await prisma.comment.findUnique({
        where: { id: comment.id },
      });
      expect(commentInDb?.content).toBe('Author comment');
    });

    it('should return 404 when comment does not exist', async () => {
      const user = await createTestUser('USER');
      const token = generateToken(user.id, 'USER');

      const response = await request(app)
        .put('/api/comments/999999')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Updating non-existent comment' })
        .expect(404);

      expect(response.body).toEqual({ message: 'Comment not found' });
    });

    it('should return 422 when commentId parameter is invalid', async () => {
      const user = await createTestUser('USER');
      const token = generateToken(user.id, 'USER');

      const response = await request(app)
        .put('/api/comments/not-a-number')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Valid content' })
        .expect(422);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.message).toBe('Validation failed');
    });

    it('should return 422 when content is not a string', async () => {
      const author = await createTestUser('USER');
      const token = generateToken(author.id, 'USER');

      const post = await createTestPost(author.id);
      const comment = await prisma.comment.create({
        data: createRandomComment({ userId: author.id, postId: post.id }),
      });

      const response = await request(app)
        .put(`/api/comments/${comment.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 12345 })
        .expect(422);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('DELETE /api/comments/:commentId (Delete comment)', () => {
    it('should successfully delete a comment as the comment author', async () => {
      const author = await createTestUser('USER');
      const token = generateToken(author.id, 'USER');

      const post = await createTestPost(author.id);
      const comment = await prisma.comment.create({
        data: createRandomComment({ userId: author.id, postId: post.id }),
      });

      await request(app)
        .delete(`/api/comments/${comment.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      const commentInDb = await prisma.comment.findUnique({
        where: { id: comment.id },
      });
      expect(commentInDb).toBeNull();
    });

    it('should successfully delete a comment as an ADMIN user (not the author)', async () => {
      const author = await createTestUser('USER');
      const admin = await createTestUser('ADMIN');
      const token = generateToken(admin.id, 'ADMIN');

      const post = await createTestPost(author.id);
      const comment = await prisma.comment.create({
        data: createRandomComment({ userId: author.id, postId: post.id }),
      });

      await request(app)
        .delete(`/api/comments/${comment.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      const commentInDb = await prisma.comment.findUnique({
        where: { id: comment.id },
      });
      expect(commentInDb).toBeNull();
    });

    it('should return 401 when token is missing', async () => {
      const user = await createTestUser();
      const post = await createTestPost(user.id);
      const comment = await prisma.comment.create({
        data: createRandomComment({ userId: user.id, postId: post.id }),
      });

      const response = await request(app).delete(`/api/comments/${comment.id}`).expect(401);

      expect(response.body).toEqual({ message: 'Token not found or invalid format' });
    });

    it('should return 401 when token is invalid', async () => {
      const user = await createTestUser();
      const post = await createTestPost(user.id);
      const comment = await prisma.comment.create({
        data: createRandomComment({ userId: user.id, postId: post.id }),
      });

      const response = await request(app)
        .delete(`/api/comments/${comment.id}`)
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body).toEqual({ message: 'Invalid or expired token' });
    });

    it("should return 403 Forbidden when a regular user tries to delete another user's comment", async () => {
      const author = await createTestUser('USER');
      const otherUser = await createTestUser('USER');
      const token = generateToken(otherUser.id, 'USER');

      const post = await createTestPost(author.id);
      const comment = await prisma.comment.create({
        data: createRandomComment({ userId: author.id, postId: post.id }),
      });

      const response = await request(app)
        .delete(`/api/comments/${comment.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body).toEqual({ message: "You don't have access to delete this comment" });

      const commentInDb = await prisma.comment.findUnique({
        where: { id: comment.id },
      });
      expect(commentInDb).not.toBeNull();
    });

    it("should return 403 Forbidden when an EDITOR tries to delete another user's comment", async () => {
      const author = await createTestUser('USER');
      const editor = await createTestUser('EDITOR');
      const token = generateToken(editor.id, 'EDITOR');

      const post = await createTestPost(author.id);
      const comment = await prisma.comment.create({
        data: createRandomComment({ userId: author.id, postId: post.id }),
      });

      const response = await request(app)
        .delete(`/api/comments/${comment.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body).toEqual({ message: "You don't have access to delete this comment" });

      const commentInDb = await prisma.comment.findUnique({
        where: { id: comment.id },
      });
      expect(commentInDb).not.toBeNull();
    });

    it('should return 404 when trying to delete a non-existent comment', async () => {
      const user = await createTestUser('USER');
      const token = generateToken(user.id, 'USER');

      const response = await request(app)
        .delete('/api/comments/999999')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body).toEqual({ message: 'Comment not found' });
    });

    it('should return 422 when commentId parameter is invalid', async () => {
      const user = await createTestUser('USER');
      const token = generateToken(user.id, 'USER');

      const response = await request(app)
        .delete('/api/comments/invalid-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(422);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.message).toBe('Validation failed');
    });
  });
});
