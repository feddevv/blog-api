import { Response } from 'express';
import { prisma } from '../db/prisma.js';
import { AuthenticatedRequest } from '../types/types.js';
import { Prisma } from '../generated/prisma/client.js';
import { CreatePostBody, FilterQueryOutput, PostParamsOutput } from '../validation/schemas.js';
import { HttpError } from '../errors/HttpError.js';

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

export async function getPostById(req: AuthenticatedRequest<PostParamsOutput>, res: Response) {
  const { id } = req.params;

  const post = await prisma.post.findUnique({
    where: {
      id,
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
  const { title, content, state } = req.body;

  const userId = req.user!.id;

  await prisma.post.create({
    data: {
      title,
      content,
      state,
      userId,
    },
  });

  res.sendStatus(201);
}
