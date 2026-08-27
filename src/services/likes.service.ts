import { HttpError } from '../errors/HttpError.js';
import { prisma } from '../lib/prisma.js';

export async function toggleLike({ postId, userId }: { postId: number; userId: number }) {
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
