import { Response } from 'express';
import { AuthenticatedRequest } from '../types/types.js';
import * as likesService from '../services/likes.service.js';
import { CommentParams } from '../validation/commentsSchemas.js';

export async function toggleCommentLike(req: AuthenticatedRequest<CommentParams>, res: Response) {
  const { commentId } = req.params;
  const { id } = req.user!;

  const isLiked = await likesService.toggleCommentLike({
    commentId: Number(commentId),
    userId: id,
  });

  res.status(201).json({ message: isLiked ? 'Liked' : 'Unliked' });
}
