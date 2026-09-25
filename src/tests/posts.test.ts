import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { createRandomPost } from '../utils/seedFactories.js';
import request from 'supertest';
import { app } from '../app.js';
import { createTestUser, generateToken } from './testUtils.js';

const sampleImageBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

vi.mock('../lib/s3.ts', () => {
  return {
    s3: {
      send: vi.fn(),
    },
  };
});

describe('Posts', () => {
  beforeEach(async () => {
    await prisma.post.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('GET /api/posts (Get posts)', () => {
    it('should return paginated posts with default page and size when no query params are set', async () => {
      const user = await createTestUser();
      const postsData = Array.from({ length: 12 }, () =>
        createRandomPost({ userId: user.id, state: 'PUBLISHED' }),
      );
      await prisma.post.createMany({ data: postsData });

      const response = await request(app).get('/api/posts').expect(200);

      expect(response.body.data).toHaveLength(10);
      expect(response.body.totalCount).toBe(12);
      expect(response.body.pageSize).toBe(10);
      expect(response.body.currentPage).toBe(1);
    });

    it('should correctly calculate paginating data when there are no posts', async () => {
      const response = await request(app).get('/api/posts').expect(200);

      expect(response.body.data).toEqual([]);
      expect(response.body.totalCount).toBe(0);
      expect(response.body.pageSize).toBe(10);
      expect(response.body.currentPage).toBe(1);
    });

    it('should correctly calculate paginating data with limit url param set', async () => {
      const user = await createTestUser();
      const postsData = Array.from({ length: 7 }, () =>
        createRandomPost({ userId: user.id, state: 'PUBLISHED' }),
      );
      await prisma.post.createMany({ data: postsData });

      const response = await request(app).get('/api/posts').query({ limit: 2 }).expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.totalCount).toBe(7);
      expect(response.body.pageSize).toBe(2);
      expect(response.body.currentPage).toBe(1);
    });

    it('should offset data when page url param set and return correct pagination meta', async () => {
      const user = await createTestUser();
      const postsData = Array.from({ length: 5 }, () =>
        createRandomPost({ userId: user.id, state: 'PUBLISHED' }),
      );
      await prisma.post.createMany({ data: postsData });

      const response = await request(app)
        .get('/api/posts')
        .query({ limit: 2, page: 2 })
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.totalCount).toBe(5);
      expect(response.body.pageSize).toBe(2);
      expect(response.body.currentPage).toBe(2);
    });

    it('should return only PUBLISHED posts for unauthenticated users', async () => {
      const user = await createTestUser();
      const publishedPost = await prisma.post.create({
        data: {
          ...createRandomPost({ userId: user.id, state: 'PUBLISHED' }),
          title: 'Public Post',
        },
      });
      await prisma.post.create({
        data: { ...createRandomPost({ userId: user.id, state: 'DRAFT' }), title: 'Draft Post' },
      });
      await prisma.post.create({
        data: { ...createRandomPost({ userId: user.id, state: 'HIDDEN' }), title: 'Hidden Post' },
      });

      const response = await request(app).get('/api/posts').expect(200);

      expect(response.body.totalCount).toBe(1);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(publishedPost.id);
      expect(response.body.data[0].state).toBe('PUBLISHED');
    });

    it('should return only PUBLISHED posts for regular authenticated users (role USER)', async () => {
      const regularUser = await createTestUser('USER');
      const token = generateToken(regularUser.id, 'USER');

      const publishedPost = await prisma.post.create({
        data: { ...createRandomPost({ userId: regularUser.id, state: 'PUBLISHED' }) },
      });
      await prisma.post.create({
        data: { ...createRandomPost({ userId: regularUser.id, state: 'DRAFT' }) },
      });
      await prisma.post.create({
        data: { ...createRandomPost({ userId: regularUser.id, state: 'HIDDEN' }) },
      });

      const response = await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.totalCount).toBe(1);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(publishedPost.id);
      expect(response.body.data[0].state).toBe('PUBLISHED');
    });

    it('should return all posts including DRAFT and HIDDEN for ADMIN users when no state filter is set', async () => {
      const admin = await createTestUser('ADMIN');
      const token = generateToken(admin.id, 'ADMIN');

      const post1 = await prisma.post.create({
        data: { ...createRandomPost({ userId: admin.id, state: 'PUBLISHED' }) },
      });
      const post2 = await prisma.post.create({
        data: { ...createRandomPost({ userId: admin.id, state: 'DRAFT' }) },
      });
      const post3 = await prisma.post.create({
        data: { ...createRandomPost({ userId: admin.id, state: 'HIDDEN' }) },
      });

      const response = await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.totalCount).toBe(3);
      expect(response.body.data).toHaveLength(3);
      const postIds = response.body.data.map((p: { id: number }) => p.id);
      expect(postIds).toEqual(expect.arrayContaining([post1.id, post2.id, post3.id]));
    });

    it('should filter posts by state when state query param is provided by ADMIN', async () => {
      const admin = await createTestUser('ADMIN');
      const token = generateToken(admin.id, 'ADMIN');

      await prisma.post.create({
        data: { ...createRandomPost({ userId: admin.id, state: 'PUBLISHED' }) },
      });
      const draftPost = await prisma.post.create({
        data: { ...createRandomPost({ userId: admin.id, state: 'DRAFT' }) },
      });
      await prisma.post.create({
        data: { ...createRandomPost({ userId: admin.id, state: 'HIDDEN' }) },
      });

      const response = await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .query({ state: 'DRAFT' })
        .expect(200);

      expect(response.body.totalCount).toBe(1);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(draftPost.id);
      expect(response.body.data[0].state).toBe('DRAFT');
    });

    it('should filter posts by search term matching title, description, or content', async () => {
      const user = await createTestUser();
      const matchTitle = await prisma.post.create({
        data: {
          ...createRandomPost({ userId: user.id }),
          title: 'Unique TypeScript Guide',
        },
      });
      const matchDesc = await prisma.post.create({
        data: {
          ...createRandomPost({ userId: user.id }),
          description: 'A deep dive into typescript typing',
        },
      });
      const matchContent = await prisma.post.create({
        data: {
          ...createRandomPost({ userId: user.id }),
          content: 'Learning typescript advanced features',
        },
      });
      await prisma.post.create({
        data: {
          ...createRandomPost({ userId: user.id }),
          title: 'Completely Unrelated Subject',
          description: 'Nothing relevant here',
          content: 'No matches found in this text',
        },
      });

      const response = await request(app)
        .get('/api/posts')
        .query({ search: 'typescript' })
        .expect(200);

      expect(response.body.totalCount).toBe(3);
      expect(response.body.data).toHaveLength(3);
      const postIds = response.body.data.map((p: { id: number }) => p.id);
      expect(postIds).toEqual(
        expect.arrayContaining([matchTitle.id, matchDesc.id, matchContent.id]),
      );
    });

    it('should return empty list when search term matches nothing', async () => {
      const user = await createTestUser();
      await prisma.post.create({
        data: { ...createRandomPost({ userId: user.id }) },
      });

      const response = await request(app)
        .get('/api/posts')
        .query({ search: 'nonexistent-search-keyword-12345' })
        .expect(200);

      expect(response.body.totalCount).toBe(0);
      expect(response.body.data).toEqual([]);
    });

    it('should include correct isLiked flag and likesCount for authenticated user', async () => {
      const user = await createTestUser();
      const token = generateToken(user.id, 'USER');

      const likedPost = await prisma.post.create({
        data: { ...createRandomPost({ userId: user.id }) },
      });
      const unlikedPost = await prisma.post.create({
        data: { ...createRandomPost({ userId: user.id }) },
      });

      await prisma.postLike.create({
        data: { postId: likedPost.id, userId: user.id },
      });

      const response = await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const returnedLiked = response.body.data.find((p: { id: number }) => p.id === likedPost.id);
      const returnedUnliked = response.body.data.find(
        (p: { id: number }) => p.id === unlikedPost.id,
      );

      expect(returnedLiked.isLiked).toBe(true);
      expect(returnedLiked.likesCount).toBe(1);
      expect(returnedUnliked.isLiked).toBe(false);
      expect(returnedUnliked.likesCount).toBe(0);
    });

    it('should return 422 when invalid query parameters are provided', async () => {
      const response = await request(app)
        .get('/api/posts')
        .query({ limit: -5, page: 'invalid', state: 'INVALID_STATE' })
        .expect(422);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.message).toBe('Validation failed');
    });

    it('should return 401 when Authorization header has an invalid token', async () => {
      const response = await request(app)
        .get('/api/posts')
        .set('Authorization', 'Bearer invalid_token_123')
        .expect(401);

      expect(response.body).toEqual({ message: 'Invalid or expired token' });
    });
  });

  describe('GET /api/posts/:postId (Get post by ID)', () => {
    it('should successfully return a published post with comments, likes count, and image URLs', async () => {
      const user = await createTestUser();
      const post = await prisma.post.create({
        data: {
          ...createRandomPost({ userId: user.id, state: 'PUBLISHED' }),
          coverImageKey: 'posts/test-cover.webp',
          thumbnailKey: 'posts/test-thumb.webp',
        },
      });

      const commentUser = await createTestUser();
      await prisma.comment.create({
        data: {
          content: 'Great post!',
          postId: post.id,
          userId: commentUser.id,
        },
      });

      const response = await request(app).get(`/api/posts/${post.id}`).expect(200);

      expect(response.body).toMatchObject({
        id: post.id,
        title: post.title,
        content: post.content,
        description: post.description,
        state: 'PUBLISHED',
        likesCount: 0,
        isLiked: false,
      });
      expect(response.body.coverImageUrl).toContain('posts/test-cover.webp');
      expect(response.body.thumbnailUrl).toContain('posts/test-thumb.webp');
      expect(response.body.comments).toHaveLength(1);
      expect(response.body.comments[0].content).toBe('Great post!');
    });

    it('should indicate isLiked: true when the requesting authenticated user has liked the post', async () => {
      const user = await createTestUser();
      const token = generateToken(user.id, 'USER');

      const post = await prisma.post.create({
        data: { ...createRandomPost({ userId: user.id, state: 'PUBLISHED' }) },
      });

      await prisma.postLike.create({
        data: { postId: post.id, userId: user.id },
      });

      const response = await request(app)
        .get(`/api/posts/${post.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.isLiked).toBe(true);
      expect(response.body.likesCount).toBe(1);
    });

    it('should return 403 Forbidden when unauthenticated user requests a DRAFT post', async () => {
      const user = await createTestUser();
      const post = await prisma.post.create({
        data: { ...createRandomPost({ userId: user.id, state: 'DRAFT' }) },
      });

      const response = await request(app).get(`/api/posts/${post.id}`).expect(403);

      expect(response.body).toEqual({ message: 'Forbidden: Admin access required' });
    });

    it('should return 403 Forbidden when unauthenticated user requests a HIDDEN post', async () => {
      const user = await createTestUser();
      const post = await prisma.post.create({
        data: { ...createRandomPost({ userId: user.id, state: 'HIDDEN' }) },
      });

      const response = await request(app).get(`/api/posts/${post.id}`).expect(403);

      expect(response.body).toEqual({ message: 'Forbidden: Admin access required' });
    });

    it('should return 403 Forbidden when a non-admin authenticated user requests a DRAFT post', async () => {
      const regularUser = await createTestUser('USER');
      const token = generateToken(regularUser.id, 'USER');

      const author = await createTestUser();
      const post = await prisma.post.create({
        data: { ...createRandomPost({ userId: author.id, state: 'DRAFT' }) },
      });

      const response = await request(app)
        .get(`/api/posts/${post.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body).toEqual({ message: 'Forbidden: Admin access required' });
    });

    it('should return 403 Forbidden when an EDITOR user requests a DRAFT post', async () => {
      const editorUser = await createTestUser('EDITOR');
      const token = generateToken(editorUser.id, 'EDITOR');

      const author = await createTestUser();
      const post = await prisma.post.create({
        data: { ...createRandomPost({ userId: author.id, state: 'DRAFT' }) },
      });

      const response = await request(app)
        .get(`/api/posts/${post.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body).toEqual({ message: 'Forbidden: Admin access required' });
    });

    it('should successfully return a DRAFT post when requested by an ADMIN', async () => {
      const admin = await createTestUser('ADMIN');
      const token = generateToken(admin.id, 'ADMIN');

      const post = await prisma.post.create({
        data: { ...createRandomPost({ userId: admin.id, state: 'DRAFT' }) },
      });

      const response = await request(app)
        .get(`/api/posts/${post.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.id).toBe(post.id);
      expect(response.body.state).toBe('DRAFT');
    });

    it('should return 404 when post does not exist', async () => {
      const response = await request(app).get('/api/posts/999999').expect(404);

      expect(response.body).toEqual({ message: 'Post not found' });
    });

    it('should return 422 when postId parameter is not a valid positive integer', async () => {
      const response = await request(app).get('/api/posts/invalid-id').expect(422);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('POST /api/posts (Create post)', () => {
    it('should successfully create a published post with valid data and image as ADMIN', async () => {
      const admin = await createTestUser('ADMIN');
      const token = generateToken(admin.id, 'ADMIN');

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .field('title', 'Brand New Post')
        .field('description', 'A concise summary of the post')
        .field('content', 'Detailed content for the new post')
        .field('state', 'PUBLISHED')
        .attach('postImage', sampleImageBuffer, 'cover.png')
        .expect(201);

      expect(response.body).toMatchObject({
        title: 'Brand New Post',
        description: 'A concise summary of the post',
        content: 'Detailed content for the new post',
        state: 'PUBLISHED',
        userId: admin.id,
      });
      expect(response.body.coverImageKey).toBeTruthy();
      expect(response.body.thumbnailKey).toBeTruthy();

      const createdPostInDb = await prisma.post.findUnique({
        where: { id: response.body.id },
      });
      expect(createdPostInDb).not.toBeNull();
      expect(createdPostInDb?.title).toBe('Brand New Post');
    });

    it('should successfully create a draft post without description and content as ADMIN', async () => {
      const admin = await createTestUser('ADMIN');
      const token = generateToken(admin.id, 'ADMIN');

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .field('title', 'Draft Post Title')
        .field('state', 'DRAFT')
        .attach('postImage', sampleImageBuffer, 'cover.png')
        .expect(201);

      expect(response.body).toMatchObject({
        title: 'Draft Post Title',
        state: 'DRAFT',
        userId: admin.id,
      });
      expect(response.body.content).toBeNull();
      expect(response.body.description).toBeNull();
    });

    it('should default title to "Untitled" when title is omitted or empty', async () => {
      const admin = await createTestUser('ADMIN');
      const token = generateToken(admin.id, 'ADMIN');

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .field('title', '   ')
        .field('state', 'DRAFT')
        .attach('postImage', sampleImageBuffer, 'cover.png')
        .expect(201);

      expect(response.body.title).toBe('Untitled');
    });

    it('should return 401 Unauthorized when no token is provided', async () => {
      const response = await request(app)
        .post('/api/posts')
        .field('title', 'Unauthorized Post')
        .attach('postImage', sampleImageBuffer, 'cover.png')
        .expect(401);

      expect(response.body).toEqual({ message: 'Token not found or invalid format' });
    });

    it('should return 401 Unauthorized when token is invalid', async () => {
      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', 'Bearer invalid_token')
        .field('title', 'Unauthorized Post')
        .attach('postImage', sampleImageBuffer, 'cover.png')
        .expect(401);

      expect(response.body).toEqual({ message: 'Invalid or expired token' });
    });

    it('should return 403 Forbidden when user role is USER', async () => {
      const user = await createTestUser('USER');
      const token = generateToken(user.id, 'USER');

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .field('title', 'User Post Attempt')
        .attach('postImage', sampleImageBuffer, 'cover.png')
        .expect(403);

      expect(response.body).toEqual({ message: 'Forbidden: Admin access required' });
    });

    it('should return 403 Forbidden when user role is EDITOR (creating post requires ADMIN)', async () => {
      const editor = await createTestUser('EDITOR');
      const token = generateToken(editor.id, 'EDITOR');

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .field('title', 'Editor Post Attempt')
        .attach('postImage', sampleImageBuffer, 'cover.png')
        .expect(403);

      expect(response.body).toEqual({ message: 'Forbidden: Admin access required' });
    });

    it('should return 422 when image file is missing', async () => {
      const admin = await createTestUser('ADMIN');
      const token = generateToken(admin.id, 'ADMIN');

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .field('title', 'Post Without Image')
        .field('description', 'Description')
        .field('content', 'Content')
        .field('state', 'PUBLISHED')
        .expect(422);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.message).toBe('Validation failed');
    });

    it('should return 422 when uploaded file has an unsupported mimetype', async () => {
      const admin = await createTestUser('ADMIN');
      const token = generateToken(admin.id, 'ADMIN');

      const textBuffer = Buffer.from('plain text content', 'utf-8');

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .field('title', 'Post With Bad File')
        .attach('postImage', textBuffer, 'file.txt')
        .expect(422);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.message).toBe('Validation failed');
    });

    it('should return 400 when publishing post without content', async () => {
      const admin = await createTestUser('ADMIN');
      const token = generateToken(admin.id, 'ADMIN');

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .field('title', 'Post Without Content')
        .field('description', 'Valid description')
        .field('state', 'PUBLISHED')
        .attach('postImage', sampleImageBuffer, 'cover.png')
        .expect(400);

      expect(response.body).toEqual({ message: 'Content is required for publishing posts' });
    });

    it('should return 400 when publishing post without description', async () => {
      const admin = await createTestUser('ADMIN');
      const token = generateToken(admin.id, 'ADMIN');

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .field('title', 'Post Without Description')
        .field('content', 'Valid content')
        .field('state', 'PUBLISHED')
        .attach('postImage', sampleImageBuffer, 'cover.png')
        .expect(400);

      expect(response.body).toEqual({ message: 'Description is required for publishing posts' });
    });

    it('should return 422 when title is provided but shorter than 5 characters', async () => {
      const admin = await createTestUser('ADMIN');
      const token = generateToken(admin.id, 'ADMIN');

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${token}`)
        .field('title', 'Tiny')
        .attach('postImage', sampleImageBuffer, 'cover.png')
        .expect(422);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('PUT /api/posts/:postId (Update post)', () => {
    it('should successfully update post details as ADMIN', async () => {
      const admin = await createTestUser('ADMIN');
      const token = generateToken(admin.id, 'ADMIN');

      const post = await prisma.post.create({
        data: {
          ...createRandomPost({ userId: admin.id, state: 'PUBLISHED' }),
          title: 'Original Title',
          description: 'Original description',
          content: 'Original content',
        },
      });

      const response = await request(app)
        .put(`/api/posts/${post.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Updated Post Title',
          description: 'Updated description',
          content: 'Updated content',
          state: 'PUBLISHED',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        id: post.id,
        title: 'Updated Post Title',
        description: 'Updated description',
        content: 'Updated content',
        state: 'PUBLISHED',
      });

      const updatedInDb = await prisma.post.findUnique({ where: { id: post.id } });
      expect(updatedInDb?.title).toBe('Updated Post Title');
    });

    it('should successfully update post details as EDITOR', async () => {
      const editor = await createTestUser('EDITOR');
      const token = generateToken(editor.id, 'EDITOR');

      const author = await createTestUser('ADMIN');
      const post = await prisma.post.create({
        data: { ...createRandomPost({ userId: author.id, state: 'PUBLISHED' }) },
      });

      const response = await request(app)
        .put(`/api/posts/${post.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Editor Modified Title',
        })
        .expect(200);

      expect(response.body.title).toBe('Editor Modified Title');
    });

    it('should successfully update post with a new image', async () => {
      const admin = await createTestUser('ADMIN');
      const token = generateToken(admin.id, 'ADMIN');

      const post = await prisma.post.create({
        data: {
          ...createRandomPost({ userId: admin.id, state: 'PUBLISHED' }),
          coverImageKey: 'posts/old-cover.webp',
          thumbnailKey: 'posts/old-thumb.webp',
        },
      });

      const response = await request(app)
        .put(`/api/posts/${post.id}`)
        .set('Authorization', `Bearer ${token}`)
        .field('title', 'Updated With New Image')
        .attach('postImage', sampleImageBuffer, 'new-image.png')
        .expect(200);

      expect(response.body.coverImageKey).toBeTruthy();
      expect(response.body.coverImageKey).not.toBe('posts/old-cover.webp');
      expect(response.body.thumbnailKey).toBeTruthy();
      expect(response.body.thumbnailKey).not.toBe('posts/old-thumb.webp');
    });

    it('should return 401 when token is missing', async () => {
      const user = await createTestUser();
      const post = await prisma.post.create({
        data: { ...createRandomPost({ userId: user.id }) },
      });

      const response = await request(app)
        .put(`/api/posts/${post.id}`)
        .send({ title: 'Unauthorized Update' })
        .expect(401);

      expect(response.body).toEqual({ message: 'Token not found or invalid format' });
    });

    it('should return 401 when token is invalid', async () => {
      const user = await createTestUser();
      const post = await prisma.post.create({
        data: { ...createRandomPost({ userId: user.id }) },
      });

      const response = await request(app)
        .put(`/api/posts/${post.id}`)
        .set('Authorization', 'Bearer invalid_token')
        .send({ title: 'Unauthorized Update' })
        .expect(401);

      expect(response.body).toEqual({ message: 'Invalid or expired token' });
    });

    it('should return 403 Forbidden when a regular USER tries to update a post', async () => {
      const user = await createTestUser('USER');
      const token = generateToken(user.id, 'USER');

      const post = await prisma.post.create({
        data: { ...createRandomPost({ userId: user.id }) },
      });

      const response = await request(app)
        .put(`/api/posts/${post.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'User Attempting Update' })
        .expect(403);

      expect(response.body).toEqual({ message: 'Forbidden: Admin or editor access required' });
    });

    it('should return 404 when post does not exist', async () => {
      const admin = await createTestUser('ADMIN');
      const token = generateToken(admin.id, 'ADMIN');

      const response = await request(app)
        .put('/api/posts/999999')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updating Nonexistent Post' })
        .expect(404);

      expect(response.body).toEqual({ message: 'Post not found' });
    });

    it('should return 422 when updating a draft to PUBLISHED without content', async () => {
      const admin = await createTestUser('ADMIN');
      const token = generateToken(admin.id, 'ADMIN');

      const draftPost = await prisma.post.create({
        data: {
          title: 'Draft Post',
          state: 'DRAFT',
          userId: admin.id,
          description: 'Valid description',
          content: null,
        },
      });

      const response = await request(app)
        .put(`/api/posts/${draftPost.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ state: 'PUBLISHED' })
        .expect(422);

      expect(response.body).toEqual({ message: 'Content is required for publishing posts' });
    });

    it('should return 422 when updating a draft to PUBLISHED without description', async () => {
      const admin = await createTestUser('ADMIN');
      const token = generateToken(admin.id, 'ADMIN');

      const draftPost = await prisma.post.create({
        data: {
          title: 'Draft Post',
          state: 'DRAFT',
          userId: admin.id,
          description: null,
          content: 'Valid content',
        },
      });

      const response = await request(app)
        .put(`/api/posts/${draftPost.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ state: 'PUBLISHED' })
        .expect(422);

      expect(response.body).toEqual({ message: 'Description is required for publishing posts' });
    });

    it('should return 422 when title is shorter than 5 characters', async () => {
      const admin = await createTestUser('ADMIN');
      const token = generateToken(admin.id, 'ADMIN');

      const post = await prisma.post.create({
        data: { ...createRandomPost({ userId: admin.id }) },
      });

      const response = await request(app)
        .put(`/api/posts/${post.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Abc' })
        .expect(422);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.message).toBe('Validation failed');
    });

    it('should return 422 when postId parameter is invalid', async () => {
      const admin = await createTestUser('ADMIN');
      const token = generateToken(admin.id, 'ADMIN');

      const response = await request(app)
        .put('/api/posts/not-a-number')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Valid New Title' })
        .expect(422);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('DELETE /api/posts/:postId (Delete post)', () => {
    it('should successfully delete an existing post as ADMIN', async () => {
      const admin = await createTestUser('ADMIN');
      const token = generateToken(admin.id, 'ADMIN');

      const post = await prisma.post.create({
        data: {
          ...createRandomPost({ userId: admin.id }),
          coverImageKey: 'posts/test-cover.webp',
          thumbnailKey: 'posts/test-thumb.webp',
        },
      });

      await request(app)
        .delete(`/api/posts/${post.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      const postInDb = await prisma.post.findUnique({
        where: { id: post.id },
      });
      expect(postInDb).toBeNull();
    });

    it('should return 401 when token is missing', async () => {
      const user = await createTestUser();
      const post = await prisma.post.create({
        data: { ...createRandomPost({ userId: user.id }) },
      });

      const response = await request(app).delete(`/api/posts/${post.id}`).expect(401);

      expect(response.body).toEqual({ message: 'Token not found or invalid format' });
    });

    it('should return 401 when token is invalid', async () => {
      const user = await createTestUser();
      const post = await prisma.post.create({
        data: { ...createRandomPost({ userId: user.id }) },
      });

      const response = await request(app)
        .delete(`/api/posts/${post.id}`)
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body).toEqual({ message: 'Invalid or expired token' });
    });

    it('should return 403 Forbidden when user role is USER', async () => {
      const user = await createTestUser('USER');
      const token = generateToken(user.id, 'USER');

      const post = await prisma.post.create({
        data: { ...createRandomPost({ userId: user.id }) },
      });

      const response = await request(app)
        .delete(`/api/posts/${post.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body).toEqual({ message: 'Forbidden: Admin access required' });
    });

    it('should return 403 Forbidden when user role is EDITOR (deletion requires ADMIN)', async () => {
      const editor = await createTestUser('EDITOR');
      const token = generateToken(editor.id, 'EDITOR');

      const user = await createTestUser();
      const post = await prisma.post.create({
        data: { ...createRandomPost({ userId: user.id }) },
      });

      const response = await request(app)
        .delete(`/api/posts/${post.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body).toEqual({ message: 'Forbidden: Admin access required' });
    });

    it('should return 404 when trying to delete a non-existent post', async () => {
      const admin = await createTestUser('ADMIN');
      const token = generateToken(admin.id, 'ADMIN');

      const response = await request(app)
        .delete('/api/posts/999999')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body).toEqual({ message: 'Post not found' });
    });

    it('should return 422 when postId parameter is invalid', async () => {
      const admin = await createTestUser('ADMIN');
      const token = generateToken(admin.id, 'ADMIN');

      const response = await request(app)
        .delete('/api/posts/invalid-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(422);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.message).toBe('Validation failed');
    });
  });
});
