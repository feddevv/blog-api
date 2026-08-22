import { NextFunction, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/types.js';
import { Prisma } from '../generated/prisma/client.js';
import {
  CreatePostBody,
  FilterQueryOutput,
  PostParams,
  UpdatePostBody,
} from '../validation/postsSchemas.js';
import { HttpError } from '../errors/HttpError.js';
import { PrismaClientKnownRequestError } from '../generated/prisma/internal/prismaNamespace.js';
import { s3 } from '../lib/s3.js';
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

export async function getPosts(
  req: AuthenticatedRequest<unknown, unknown, unknown, FilterQueryOutput>,
  res: Response,
) {
  const { state, search, limit, page } = req.query;

  const where: Prisma.PostWhereInput = {};

  const isAdmin = req.user?.role === 'ADMIN';
  where.state = isAdmin ? state : 'PUBLISHED';

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const skip = ((page ?? 1) - 1) * (limit ?? 10);

  const [posts, postsCount] = await prisma.$transaction([
    prisma.post.findMany({
      where,
      take: limit ?? 10,
      skip,
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.post.count({ where }),
  ]);

  res.json({ data: posts, totalCount: postsCount, currentPage: page ?? 1, pageSize: limit ?? 10 });
}

export async function getPostById(req: AuthenticatedRequest<PostParams>, res: Response) {
  const { postId } = req.params;

  const post = await prisma.post.findUnique({
    where: {
      id: Number(postId),
    },
    include: {
      comments: {
        take: 10,
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });

  if (!post) {
    throw new HttpError(404, 'Post not found');
  }

  if (
    (post.state !== 'PUBLISHED' && !req.user) ||
    (req.user && post.state !== 'PUBLISHED' && req.user.role !== 'ADMIN')
  ) {
    throw new HttpError(403, 'Forbidden: Admin access required');
  }

  const imageUrl = `${process.env.R2_PUBLIC_URL}/${post.imageKey}`;

  res.json({ ...post, imageUrl });
}

export async function createPost(
  req: AuthenticatedRequest<unknown, unknown, CreatePostBody>,
  res: Response,
  next: NextFunction,
) {
  const { title, content, state, description } = req.body;

  if (state !== 'DRAFT' && state !== undefined) {
    if (!content) {
      throw new HttpError(400, 'Content is required for publishing posts');
    } else if (!description) {
      throw new HttpError(400, 'Description is required for publishing posts');
    }
  }

  if (!req.file) throw new HttpError(400, "File wasn't sent");

  const key = `posts/${crypto.randomUUID()}-${req.file.originalname}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: 'blog-api-bucket',
      Key: key,
      Body: req.file.buffer,
    }),
  );

  const userId = req.user!.id;

  try {
    const post = await prisma.post.create({
      data: {
        title,
        content,
        state,
        userId,
        description,
        imageKey: key,
      },
    });
    res.status(201).json(post);
  } catch (err) {
    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: 'blog-api-bucket',
          Key: key,
        }),
      );
    } catch (deleteError) {
      console.error('Unable to delete from the bucket', deleteError);
    }

    next(err);
  }
}

export async function updatePost(
  req: AuthenticatedRequest<PostParams, unknown, UpdatePostBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const { title, content, state, description } = req.body;
    const { postId } = req.params;

    const post = await prisma.post.findUnique({
      where: {
        id: Number(postId),
      },
    });

    if (state !== 'DRAFT' && state !== undefined) {
      const finalContent = content ?? post?.content;
      const finalDescription = description ?? post?.description;

      if (!finalContent) {
        throw new HttpError(422, 'Content is required for publishing posts');
      }

      if (!finalDescription) {
        throw new HttpError(422, 'Description is required for publishing posts');
      }
    }

    const updatedPost = await prisma.post.update({
      where: {
        id: Number(postId),
      },
      data: {
        title,
        content,
        state,
        description,
      },
    });

    res.json(updatedPost);
  } catch (err) {
    if (err instanceof PrismaClientKnownRequestError && err.code === 'P2025') {
      return next(new HttpError(404, 'Post not found'));
    }

    next(err);
  }
}

export async function deletePost(
  req: AuthenticatedRequest<PostParams>,
  res: Response,
  next: NextFunction,
) {
  try {
    const { postId } = req.params;

    await prisma.post.delete({
      where: {
        id: Number(postId),
      },
    });

    res.sendStatus(204);
  } catch (err) {
    if (err instanceof PrismaClientKnownRequestError && err.code === 'P2025') {
      return next(new HttpError(404, 'Post not found'));
    }

    next(err);
  }
}
