import { HttpError } from '../errors/HttpError.js';
import { prisma } from '../lib/prisma.js';

interface TogglePostLike {
  postId: number;
  userId: number;
}
export async function togglePostLike({ postId, userId }: TogglePostLike) {
  const post = await prisma.post.findUnique({
    where: {
      id: postId,
    },
  });

  if (!post) throw new HttpError(404, 'Post not found');

  const deleted = await prisma.postLike.deleteMany({
    where: {
      userId,
      postId,
    },
  });

  if (deleted.count > 0) return false;

  await prisma.postLike.create({
    data: {
      postId,
      userId,
    },
  });

  return true;
}

interface TogglePostLike {
  commentId: number;
  userId: number;
}
export async function toggleCommentLike({ commentId, userId }: TogglePostLike) {
  const comment = await prisma.comment.findUnique({
    where: {
      id: commentId,
    },
  });

  if (!comment) throw new HttpError(404, 'Comment not found');

  const deleted = await prisma.commentLike.deleteMany({
    where: {
      commentId,
      userId,
    },
  });

  if (deleted.count > 0) return false;

  await prisma.commentLike.create({
    data: {
      commentId,
      userId,
    },
  });

  return true;
}
