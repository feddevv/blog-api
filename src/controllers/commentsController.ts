import { Response } from 'express';
import { AuthenticatedRequest } from '../types/types.js';
import {
  CommentsParams,
  CreateCommentBody,
  UpdateCommentBody,
} from '../validation/commentsSchemas.js';
import { prisma } from '../db/prisma.js';
import { HttpError } from '../errors/HttpError.js';
import { PostParams } from '../validation/postsSchemas.js';

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

export async function getPostComments(req: AuthenticatedRequest<PostParams>, res: Response) {
  const { postId } = req.params;

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

  const comments = await prisma.comment.findMany({
    where: {
      postId: Number(postId),
    },
  });

  res.json(comments);
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
