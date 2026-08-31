import { HttpError } from '../errors/HttpError.js';
import { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { AuthUser } from '../types/auth.types.js';
import { FilterQueryOutput } from '../validation/postsSchemas.js';

interface GetCommentByIdParams {
  commentId: number;
  user?: AuthUser;
}
export async function getCommentById({ commentId, user }: GetCommentByIdParams) {
  const comment = await prisma.comment.findFirst({
    where: {
      id: commentId,
      post: {
        state: 'PUBLISHED',
      },
    },
    include: {
      likes: user ? { where: { userId: user.id } } : false,
      _count: {
        select: {
          likes: true,
        },
      },
    },
  });

  if (!comment) {
    throw new HttpError(404, 'Comment not found');
  }

  const { _count, likes, ...restComment } = comment;
  const likesCount = _count.likes;
  const isLiked = likes ? likes.length > 0 : false;

  return { ...restComment, likesCount, isLiked };
}

interface UpdateCommentParams {
  commentId: number;
  content?: string;
  user?: AuthUser;
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

interface DeleteCommentParams {
  commentId: number;
  user?: AuthUser;
}
export async function deleteComment({ commentId, user }: DeleteCommentParams) {
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
  user?: AuthUser;
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
        likes: user ? { where: { userId: user.id } } : false,
        _count: {
          select: {
            likes: true,
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

  const mappedComments = comments.map(({ _count, likes, ...comment }) => {
    const likesCount = _count.likes;
    const isLiked = likes ? likes.length > 0 : false;

    return { ...comment, likesCount, isLiked };
  });

  return { comments: mappedComments, commentsCount };
}

interface CreateCommentParams {
  postId: number;
  content: string;
  user?: AuthUser;
}
export async function createComment({ postId, content, user }: CreateCommentParams) {
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
