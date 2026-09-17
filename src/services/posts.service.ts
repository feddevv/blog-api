import { HttpError } from '../errors/HttpError.js';
import { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { CreatePostBody, FilterQueryOutput, UpdatePostBody } from '../validation/postsSchemas.js';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { AuthUser } from '../types/auth.types.js';
import * as mediaService from './media.service.js';

interface GetPostsParams extends FilterQueryOutput {
  user?: AuthUser;
}

export async function getPosts({ limit, page, search, state, user }: GetPostsParams) {
  const where: Prisma.PostWhereInput = {};

  const isAdmin = user?.role === 'ADMIN';
  where.state = isAdmin ? state : 'PUBLISHED';

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const skip = ((page ?? 1) - 1) * (limit ?? 10);

  const [posts, postsCount] = await prisma.$transaction([
    prisma.post.findMany({
      where,
      take: limit ?? 10,
      skip,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        likes: user
          ? {
              where: { userId: user.id },
              select: { id: true },
            }
          : false,
        _count: {
          select: {
            likes: true,
          },
        },
      },
    }),
    prisma.post.count({ where }),
  ]);

  const mappedPosts = posts.map(({ _count, likes, ...post }) => {
    const coverImageUrl =
      post.coverImageKey && `${process.env.R2_PUBLIC_URL}/${post.coverImageKey}`;
    const thumbnailUrl = post.thumbnailKey && `${process.env.R2_PUBLIC_URL}/${post.thumbnailKey}`;
    const likesCount = _count.likes;
    const isLiked = likes ? likes.length > 0 : false;

    return { ...post, coverImageUrl, thumbnailUrl, likesCount, isLiked };
  });

  return { posts: mappedPosts, postsCount };
}

interface GetPostByIdParams {
  postId: number;
  user?: AuthUser;
}
export async function getPostById({ postId, user }: GetPostByIdParams) {
  const post = await prisma.post.findUnique({
    where: {
      id: Number(postId),
    },
    include: {
      comments: {
        take: 10,
        orderBy: {
          createdAt: 'desc',
        },
      },
      likes: user
        ? {
            where: {
              userId: user.id,
            },
          }
        : false,
      _count: {
        select: {
          likes: true,
        },
      },
    },
  });

  if (!post) {
    throw new HttpError(404, 'Post not found');
  }

  if (
    (post.state !== 'PUBLISHED' && !user) ||
    (user && post.state !== 'PUBLISHED' && user.role !== 'ADMIN')
  ) {
    throw new HttpError(403, 'Forbidden: Admin access required');
  }

  const { _count, likes, ...rest } = post;
  const coverImageUrl = `${process.env.R2_PUBLIC_URL}/${post.coverImageKey}`;
  const thumbnailUrl = `${process.env.R2_PUBLIC_URL}/${post.thumbnailKey}`;
  const likesCount = _count.likes;
  const isLiked = likes ? likes.length > 0 : false;

  return { ...rest, coverImageUrl, thumbnailUrl, likesCount, isLiked };
}

interface CreatePostParams extends CreatePostBody {
  file?: Express.Multer.File;
  user?: AuthUser;
}
export async function createPost({
  title,
  content,
  description,
  state,
  file,
  user,
}: CreatePostParams) {
  if (state !== 'DRAFT' && state !== undefined) {
    if (!content) {
      throw new HttpError(400, 'Content is required for publishing posts');
    } else if (!description) {
      throw new HttpError(400, 'Description is required for publishing posts');
    }
  }

  let thumbnailKey: string | null = null;
  let coverImageKey: string | null = null;
  if (file) {
    const { thumbnailBuffer, coverImageBuffer } = await mediaService.processPostImages(file.buffer);

    const id = crypto.randomUUID();
    thumbnailKey = `posts/${id}-thumb.webp`;
    coverImageKey = `posts/${id}-cover.webp`;

    await Promise.all([
      mediaService.uploadImage('blog-api-bucket', thumbnailKey, thumbnailBuffer),
      mediaService.uploadImage('blog-api-bucket', coverImageKey, coverImageBuffer),
    ]);
  }

  try {
    const post = await prisma.post.create({
      data: {
        title,
        content,
        state,
        userId: user!.id,
        description,
        coverImageKey,
        thumbnailKey,
      },
    });

    return post;
  } catch (err) {
    if (thumbnailKey && coverImageKey) {
      try {
        await Promise.all([
          mediaService.deleteImage('blog-api-bucket', thumbnailKey),
          mediaService.deleteImage('blog-api-bucket', coverImageKey),
        ]);
      } catch (deleteError) {
        console.error('Unable to delete from the bucket', deleteError);
      }
    }

    throw err;
  }
}

interface UpdatePostParams extends UpdatePostBody {
  file?: Express.Multer.File;
  postId: number;
}
export async function updatePost({
  content,
  description,
  state,
  title,
  postId,
  file,
}: UpdatePostParams) {
  const post = await prisma.post.findUnique({
    where: {
      id: postId,
    },
  });

  if (!post) {
    throw new HttpError(404, 'Post not found');
  }

  if (
    state === 'PUBLISHED' ||
    state === 'HIDDEN' ||
    (state === undefined && post.state !== 'DRAFT')
  ) {
    const finalContent = content ?? post?.content;
    const finalDescription = description ?? post?.description;

    if (!finalContent) {
      throw new HttpError(422, 'Content is required for publishing posts');
    }

    if (!finalDescription) {
      throw new HttpError(422, 'Description is required for publishing posts');
    }
  }

  let thumbnailKey: string | undefined;
  let coverImageKey: string | undefined;

  if (file) {
    if (post.thumbnailKey && post.coverImageKey) {
      await Promise.all([
        mediaService.deleteImage('blog-api-bucket', post.thumbnailKey),
        mediaService.deleteImage('blog-api-bucket', post.coverImageKey),
      ]);
    }
    const { thumbnailBuffer, coverImageBuffer } = await mediaService.processPostImages(file.buffer);

    const id = crypto.randomUUID();
    thumbnailKey = `posts/${id}-thumb.webp`;
    coverImageKey = `posts/${id}-cover.webp`;

    await Promise.all([
      mediaService.uploadImage('blog-api-bucket', thumbnailKey, thumbnailBuffer),
      mediaService.uploadImage('blog-api-bucket', coverImageKey, coverImageBuffer),
    ]);
  }

  try {
    const updatedPost = await prisma.post.update({
      where: {
        id: Number(postId),
      },
      data: {
        title,
        content,
        state,
        description,
        thumbnailKey,
        coverImageKey,
      },
    });

    return updatedPost;
  } catch (err) {
    if (err instanceof PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new HttpError(404, 'Post not found');
    }

    throw err;
  }
}

interface DeletePostParams {
  postId: number;
}
export async function deletePost({ postId }: DeletePostParams) {
  try {
    const deleted = await prisma.post.delete({
      where: {
        id: Number(postId),
      },
      select: {
        coverImageKey: true,
        thumbnailKey: true,
      },
    });

    if (deleted.coverImageKey && deleted.thumbnailKey) {
      await Promise.all([
        mediaService.deleteImage('blog-api-bucket', deleted.thumbnailKey),
        mediaService.deleteImage('blog-api-bucket', deleted.coverImageKey),
      ]);
    }
  } catch (err) {
    if (err instanceof PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new HttpError(404, 'Post not found');
    }

    throw err;
  }
}
