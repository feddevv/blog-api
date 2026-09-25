import { Comment, Post, PostState, Role, User } from '../generated/prisma/client.js';

export function createRandomUser(role: Role = 'USER'): Omit<User, 'id'> {
  return {
    username: `user-${crypto.randomUUID()}`,
    email: `email-${crypto.randomUUID()}@gmail.com`,
    password: crypto.randomUUID(),
    role,
  };
}

export function createRandomPost({
  userId,
  state = 'PUBLISHED',
}: {
  userId: number;
  state?: PostState;
}): Pick<Post, 'title' | 'description' | 'content' | 'state' | 'userId'> {
  return {
    title: `title-${crypto.randomUUID()}`,
    description: `description-${crypto.randomUUID()}`,
    content: `content-${crypto.randomUUID()}`,
    state,
    userId,
  };
}

export function createRandomComment({
  userId,
  postId,
  content,
}: {
  userId: number;
  postId: number;
  content?: string;
}): Pick<Comment, 'content' | 'userId' | 'postId'> {
  return {
    content: content ?? `comment-${crypto.randomUUID()}`,
    userId,
    postId,
  };
}
