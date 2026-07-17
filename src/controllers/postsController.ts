import { Response } from 'express';
import { prisma } from '../db/prisma.js';
import { AuthenticatedRequest } from '../types/types.js';
import { Prisma } from '../generated/prisma/client.js';
import { FilterQueryOutput } from '../validation/schemas.js';

export async function getPosts(
  req: AuthenticatedRequest<unknown, unknown, unknown, FilterQueryOutput>,
  res: Response,
) {
  const { state, search, limit, page } = req.query;

  const where: Prisma.PostWhereInput = {};

  where.state = state ?? 'PUBLISHED';

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
