import { prisma } from '../src/db/prisma';
import * as bcrypt from 'bcrypt';

async function main() {
  await prisma.comment.deleteMany({});
  await prisma.post.deleteMany({});
  await prisma.user.deleteMany({});

  const hashedPassword = await bcrypt.hash('admin1234', 10);
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      password: hashedPassword,
      email: 'admin@gmail.com',
    },
  });

  await prisma.post.create({
    data: {
      title: 'Мій перший опублікований пост',
      content:
        'Це контент першого поста. Тут може бути багато тексту про веб-розробку та Express 5.',
      state: 'PUBLISHED',
      userId: admin.id,
    },
  });

  await prisma.post.create({
    data: {
      title: 'Секрети чистих контролерів у NestJS',
      content: 'Цей пост ще не готовий, тому він збережений як чернетка.',
      state: 'HIDDEN',
      userId: admin.id,
    },
  });

  await prisma.post.create({
    data: {
      title: 'TypeScript у 2026 році: Що змінилося?',
      content: 'Огляд нових фіч мови та найкращих практик для розробників.',
      state: 'PUBLISHED',
      userId: admin.id,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
