import { Response } from 'express';
import { AuthenticatedRequest } from '../types/types.js';
import {
  CommentsParams,
  CreateCommentBody,
  UpdateCommentBody,
} from '../validation/commentsSchemas.js';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../errors/HttpError.js';
import { FilterQueryOutput, PostParams } from '../validation/postsSchemas.js';
import { Prisma } from '../generated/prisma/client.js';

export async function getCommentById(req: AuthenticatedRequest<CommentsParams>, res: Response) {
  const { commentId } = req.params;

  const comment = await prisma.comment.findFirst({
    where: {
      id: Number(commentId),
      post: {
        state: 'PUBLISHED',
      },
    },
  });

  if (!comment) {
    throw new HttpError(404, 'Comment not found');
  }

  res.json(comment);
}

export async function updateComment(
  req: AuthenticatedRequest<CommentsParams, unknown, UpdateCommentBody>,
  res: Response,
) {
  const { commentId } = req.params;
  const { content } = req.body;

  const existingComment = await prisma.comment.findUnique({
    where: {
      id: Number(commentId),
    },
  });

  if (!existingComment) {
    throw new HttpError(404, 'Comment not found');
  }

  if (req.user!.id !== existingComment.userId && req.user!.role !== 'ADMIN') {
    throw new HttpError(403, "You don't have access to update this comment");
  }

  const updated = await prisma.comment.update({
    where: {
      id: Number(commentId),
    },
    data: {
      content,
    },
  });

  res.json(updated);
}

export async function deleteComment(req: AuthenticatedRequest<CommentsParams>, res: Response) {
  const { commentId } = req.params;

  const existing = await prisma.comment.findUnique({
    where: {
      id: Number(commentId),
    },
  });

  if (!existing) {
    throw new HttpError(404, 'Comment not found');
  }

  if (req.user!.id !== existing.userId && req.user!.role !== 'ADMIN') {
    throw new HttpError(403, "You don't have access to delete this comment");
  }

  await prisma.comment.delete({
    where: {
      id: Number(commentId),
    },
  });

  res.sendStatus(204);
}

export async function getPostComments(
  req: AuthenticatedRequest<PostParams, unknown, unknown, Omit<FilterQueryOutput, 'state'>>,
  res: Response,
) {
  const { postId } = req.params;
  const { limit, page, search } = req.query;

  const post = await prisma.post.findUnique({
    where: {
      id: Number(postId),
    },
    select: {
      id: true,
      state: true,
    },
  });

  if (!post) {
    throw new HttpError(404, 'Post not found');
  }

  if (
    (post.state !== 'PUBLISHED' && !req.user) ||
    (post.state !== 'PUBLISHED' && req.user && req.user.role !== 'ADMIN')
  ) {
    throw new HttpError(403, 'Forbidden: Admin access required');
  }

  const where: Prisma.CommentWhereInput = {};
  where.postId = Number(postId);

  if (search) {
    where.content = { contains: search, mode: 'insensitive' };
  }
  const skip = ((page ?? 1) - 1) * (limit ?? 10);

  const [comments, commentsCount] = await prisma.$transaction([
    prisma.comment.findMany({
      where,
      skip,
      take: limit ?? 10,
      include: {
        user: {
          select: {
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.comment.count({
      where,
    }),
  ]);

  res.json({
    data: comments,
    totalCount: commentsCount,
    currentPage: page ?? 1,
    pageSize: limit ?? 10,
  });
}

export async function createComment(
  req: AuthenticatedRequest<PostParams, unknown, CreateCommentBody>,
  res: Response,
) {
  const { postId } = req.params;
  const { content } = req.body;

  const post = await prisma.post.findUnique({
    where: {
      id: Number(postId),
    },
  });

  if (!post) {
    throw new HttpError(404, 'Post not found');
  }

  const comment = await prisma.comment.create({
    data: {
      postId: Number(postId),
      content,
      userId: req.user!.id,
    },
  });

  res.json(comment);
}
