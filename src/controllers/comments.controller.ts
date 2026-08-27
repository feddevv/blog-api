import { Response } from 'express';
import { AuthenticatedRequest } from '../types/types.js';
import {
  CommentsParams,
  CreateCommentBody,
  UpdateCommentBody,
} from '../validation/commentsSchemas.js';
import { FilterQueryOutput, PostParams } from '../validation/postsSchemas.js';
import * as commentsService from '../services/comments.service.js';

export async function getCommentById(req: AuthenticatedRequest<CommentsParams>, res: Response) {
  const { commentId } = req.params;

  const comment = await commentsService.getCommentById({
    commentId: Number(commentId),
    user: req.user,
  });

  res.json(comment);
}

export async function updateComment(
  req: AuthenticatedRequest<CommentsParams, unknown, UpdateCommentBody>,
  res: Response,
) {
  const { commentId } = req.params;
  const { content } = req.body;

  const updateComment = await commentsService.updateComment({
    commentId: Number(commentId),
    content,
    user: req.user,
  });

  res.json(updateComment);
}

export async function deleteComment(req: AuthenticatedRequest<CommentsParams>, res: Response) {
  const { commentId } = req.params;

  await commentsService.deleteComment({ commentId: Number(commentId), user: req.user });

  res.status(204).json({ message: 'Comment was successfully deleted' });
}

export async function getPostComments(
  req: AuthenticatedRequest<PostParams, unknown, unknown, Omit<FilterQueryOutput, 'state'>>,
  res: Response,
) {
  const { postId } = req.params;
  const queries = req.query;

  const { comments, commentsCount } = await commentsService.getPostComments({
    ...queries,
    postId: Number(postId),
    user: req.user,
  });

  res.json({
    data: comments,
    totalCount: commentsCount,
    currentPage: queries.page ?? 1,
    pageSize: queries.limit ?? 10,
  });
}

export async function createComment(
  req: AuthenticatedRequest<PostParams, unknown, CreateCommentBody>,
  res: Response,
) {
  const { postId } = req.params;
  const { content } = req.body;

  const comment = await commentsService.createComment({
    postId: Number(postId),
    content,
    user: req.user,
  });

  res.json(comment);
}
