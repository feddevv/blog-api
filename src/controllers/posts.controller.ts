import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import {
  CreatePostBody,
  FilterQueryOutput,
  PostParams,
  UpdatePostBody,
} from '../validation/postsSchemas.js';
import * as postsService from '../services/posts.service.js';

export async function getPosts(
  req: AuthenticatedRequest<unknown, unknown, unknown, FilterQueryOutput>,
  res: Response,
) {
  const params = req.query;

  const { posts, postsCount } = await postsService.getPosts({ ...params, user: req.user });

  res.json({
    data: posts,
    totalCount: postsCount,
    currentPage: params.page ?? 1,
    pageSize: params.limit ?? 10,
  });
}

export async function getPostById(req: AuthenticatedRequest<PostParams>, res: Response) {
  const { postId } = req.params;

  const post = await postsService.getPostById(Number(postId), req.user);

  res.json(post);
}

export async function createPost(
  req: AuthenticatedRequest<unknown, unknown, CreatePostBody>,
  res: Response,
) {
  const body = req.body;

  const post = await postsService.createPost({ ...body, file: req.file, user: req.user });

  res.status(201).json(post);
}

export async function updatePost(
  req: AuthenticatedRequest<PostParams, unknown, UpdatePostBody>,
  res: Response,
) {
  const body = req.body;
  const { postId } = req.params;

  const updatedPost = await postsService.updatePost({ ...body, postId: Number(postId) });

  res.json(updatedPost);
}

export async function deletePost(req: AuthenticatedRequest<PostParams>, res: Response) {
  const { postId } = req.params;

  await postsService.deletePost({ postId: Number(postId) });

  res.status(204).json({ message: 'Post was successfully deleted' });
}
