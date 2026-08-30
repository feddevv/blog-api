import { HttpError } from '../errors/HttpError.js';
import { prisma } from '../lib/prisma.js';

export async function togglePostLike({ postId, userId }: { postId: number; userId: number }) {
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

export async function toggleCommentLike({
  commentId,
  userId,
}: {
  commentId: number;
  userId: number;
}) {
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
