import { Response } from 'express';
import { prisma } from '../db/prisma.js';
import { AuthenticatedRequest } from '../types/types.js';
import { Prisma } from '../generated/prisma/client.js';

type PostState = 'PUBLISHED' | 'DRAFT' | 'HIDDEN';

interface FilterQuery {
  state?: PostState;
  search?: string;
  limit?: string;
  page?: string;
}

export async function getPosts(
  req: AuthenticatedRequest<unknown, unknown, unknown, FilterQuery>,
  res: Response,
) {
  const { state, search, limit, page } = req.query;

  const parsedLimit = limit ? parseInt(limit, 10) : 10;
  const parsedPage = page ? parseInt(page, 10) : 1;
  const skip = (parsedPage - 1) * parsedLimit;

  const where: Prisma.PostWhereInput = {};

  where.state = state;

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } },
    ];
  }

  const posts = await prisma.post.findMany({
    where,
    take: parsedLimit,
    skip,
    orderBy: {
      createdAt: 'desc',
    },
  });

  res.json({ posts });
}
