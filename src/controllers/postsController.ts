import { NextFunction, Response } from 'express';
import { prisma } from '../db/prisma.js';
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

  const posts = await prisma.post.findMany({
    where,
    take: limit,
    skip,
    orderBy: {
      createdAt: 'desc',
    },
  });

  res.json({ posts });
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

  res.json({ post });
}

export async function createPost(
  req: AuthenticatedRequest<unknown, unknown, CreatePostBody>,
  res: Response,
) {
  const { title, content, state, description } = req.body;

  const userId = req.user!.id;

  const post = await prisma.post.create({
    data: {
      title,
      content,
      state,
      userId,
      description,
    },
  });

  res.status(201).json(post);
}

export async function updatePost(
  req: AuthenticatedRequest<PostParams, unknown, UpdatePostBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const { title, content, state, description } = req.body;
    const { postId } = req.params;

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

export async function deletePost(req: AuthenticatedRequest<PostParams>, res: Response) {
  const { postId } = req.params;

  await prisma.post.delete({
    where: {
      id: Number(postId),
    },
  });

  res.sendStatus(204);
}
