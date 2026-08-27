import { Response } from 'express';
import { AuthenticatedRequest } from '../types/types.js';
import { PostParams } from '../validation/postsSchemas.js';
import * as likeService from '../services/likes.service.js';

export async function togglePostLike(req: AuthenticatedRequest<PostParams>, res: Response) {
  const { postId } = req.params;
  const { id } = req.user!;

  const isLiked = await likeService.togglePostLike({ postId: Number(postId), userId: id });

  res.status(201).json({ message: isLiked ? 'Liked' : 'Unliked' });
}
