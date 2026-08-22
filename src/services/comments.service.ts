import { HttpError } from '../errors/HttpError.js';
import { Prisma } from '../generated/prisma/client.js';
import { Role } from '../generated/prisma/enums.js';
import { prisma } from '../lib/prisma.js';
import { FilterQueryOutput } from '../validation/postsSchemas.js';

export async function getCommentById({ commentId }: { commentId: number }) {
  const comment = await prisma.comment.findFirst({
    where: {
      id: commentId,
      post: {
        state: 'PUBLISHED',
      },
    },
  });

  if (!comment) {
    throw new HttpError(404, 'Comment not found');
  }

  return comment;
}

interface UpdateCommentParams {
  commentId: number;
  content?: string;
  user?: {
    id: number;
    role: Role;
  };
}
export async function updateComment({ commentId, content, user }: UpdateCommentParams) {
  const existingComment = await prisma.comment.findUnique({
    where: {
      id: Number(commentId),
    },
  });

  if (!existingComment) {
    throw new HttpError(404, 'Comment not found');
  }

  if (user!.id !== existingComment.userId && user!.role !== 'ADMIN') {
    throw new HttpError(403, "You don't have access to update this comment");
  }

  const updatedComment = await prisma.comment.update({
    where: {
      id: Number(commentId),
    },
    data: {
      content,
    },
  });

  return updatedComment;
}

export async function deleteComment({
  commentId,
  user,
}: {
  commentId: number;
  user?: { id: number; role: Role };
}) {
  const existing = await prisma.comment.findUnique({
    where: {
      id: Number(commentId),
    },
  });

  if (!existing) {
    throw new HttpError(404, 'Comment not found');
  }

  if (user!.id !== existing.userId && user!.role !== 'ADMIN') {
    throw new HttpError(403, "You don't have access to delete this comment");
  }

  await prisma.comment.delete({
    where: {
      id: Number(commentId),
    },
  });
}

interface GetPostCommentsParams extends Omit<FilterQueryOutput, 'state'> {
  user?: {
    id: number;
    role: Role;
  };
  postId: number;
}
export async function getPostComments({
  limit,
  page,
  search,
  user,
  postId,
}: GetPostCommentsParams) {
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
    (post.state !== 'PUBLISHED' && !user) ||
    (post.state !== 'PUBLISHED' && user && user.role !== 'ADMIN')
  ) {
    throw new HttpError(403, 'Forbidden: Admin access required');
  }

  const where: Prisma.CommentWhereInput = {};
  where.postId = Number(postId);

  if (search) {
    where.content = { contains: search, mode: 'insensitive' };
  }
  const skip = ((page ?? 1) - 1) * (limit ?? 10);

  const [comments, commentsCount] = await prisma.$transaction([
    prisma.comment.findMany({
      where,
      skip,
      take: limit ?? 10,
      include: {
        user: {
          select: {
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.comment.count({
      where,
    }),
  ]);

  return { comments, commentsCount };
}

export async function createComment({
  postId,
  content,
  user,
}: {
  postId: number;
  content: string;
  user?: { id: number; role: Role };
}) {
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
      userId: user!.id,
    },
  });

  return comment;
}
