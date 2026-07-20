import { Response } from 'express';
import { AuthenticatedRequest } from '../types/types.js';
import { CommentsParams } from '../validation/commentsSchemas.js';
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
