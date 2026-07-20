import { Response } from 'express';
import { AuthenticatedRequest } from '../types/types.js';
import { CommentsParams, CreateCommentBody } from '../validation/commentsSchemas.js';
import { prisma } from '../db/prisma.js';
import { HttpError } from '../errors/HttpError.js';

export async function getCommentById(req: AuthenticatedRequest<CommentsParams>, res: Response) {
  const { commentId } = req.params;

  const comment = await prisma.comment.findUnique({
    where: {
      id: Number(commentId),
    },
  });

  if (!comment) {
    throw new HttpError(404, 'Comment not found');
  }

  res.json(comment);
}

export async function updateComment(
  req: AuthenticatedRequest<CommentsParams, unknown, CreateCommentBody>,
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

  if (req.user!.id !== existingComment.userId) {
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

  if (req.user!.id !== existing.userId) {
    throw new HttpError(403, "You don't have access to delete this comment");
  }

  await prisma.comment.delete({
    where: {
      id: Number(commentId),
    },
  });

  res.sendStatus(204);
}
