import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { HttpError } from '../errors/HttpError.js';
import { Prisma, Role } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { s3 } from '../lib/s3.js';
import { CreatePostBody, FilterQueryOutput, UpdatePostBody } from '../validation/postsSchemas.js';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';

interface GetPostsParams extends FilterQueryOutput {
  user?: {
    id: number;
    role: Role;
  };
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
    const imageUrl = `${process.env.R2_PUBLIC_URL}/${post.imageKey}`;
    const likesCount = _count.likes;
    const isLiked = likes ? likes.length > 0 : false;

    return { ...post, imageUrl, likesCount, isLiked };
  });

  return { posts: mappedPosts, postsCount };
}

export async function getPostById(postId: number, user?: { id: number; role: Role }) {
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
  const imageUrl = `${process.env.R2_PUBLIC_URL}/${post.imageKey}`;
  const likesCount = _count.likes;
  const isLiked = likes ? likes.length > 0 : false;

  return { ...rest, imageUrl, likesCount, isLiked };
}

interface CreatePostParams extends CreatePostBody {
  file?: Express.Multer.File;
  user?: { id: number; role: Role };
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

  if (!file) throw new HttpError(400, "File wasn't sent");

  const key = `posts/${crypto.randomUUID()}-${file.originalname}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: 'blog-api-bucket',
      Key: key,
      Body: file.buffer,
    }),
  );

  const userId = user!.id;

  try {
    const post = await prisma.post.create({
      data: {
        title,
        content,
        state,
        userId,
        description,
        imageKey: key,
      },
    });

    return post;
  } catch (err) {
    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: 'blog-api-bucket',
          Key: key,
        }),
      );
    } catch (deleteError) {
      console.error('Unable to delete from the bucket', deleteError);
    }

    throw err;
  }
}

interface UpdatePostParams extends UpdatePostBody {
  postId: number;
}
export async function updatePost({ content, description, state, title, postId }: UpdatePostParams) {
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

export async function deletePost({ postId }: { postId: number }) {
  try {
    await prisma.post.delete({
      where: {
        id: Number(postId),
      },
    });
  } catch (err) {
    if (err instanceof PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new HttpError(404, 'Post not found');
    }

    throw err;
  }
}
