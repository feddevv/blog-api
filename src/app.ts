import express, { Request, Response } from 'express';
import 'dotenv/config';
import { prisma } from './db/prisma.js';

const app = express();

app.get('/', async (req: Request, res: Response) => {
  const users = await prisma.user.findMany();

  res.json({
    users,
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, (err) => {
  if (err) {
    console.log(err.message);
  }

  console.log(`Listening to PORT: ${PORT}`);
});
