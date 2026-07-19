import express, { NextFunction, Request, Response } from 'express';
import 'dotenv/config';
import { router as authRouter } from './routes/auth.js';
import { router as postsRouter } from './routes/posts.js';
import { errorHandler } from './middleware/error.js';

const app = express();

app.use(express.json());
// TODO: MAKE req.query WRITABLE ONLY WHEN NEEDED
app.use((req: Request, res: Response, next: NextFunction) => {
  Object.defineProperty(req, 'query', {
    ...Object.getOwnPropertyDescriptor(req, 'query'),
    value: req.query,
    writable: true,
  });

  next();
});

app.use('/api/auth', authRouter);
app.use('/api/posts', postsRouter);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, (err) => {
  if (err) {
    console.log(err.message);
  }

  console.log(`Listening to PORT: ${PORT}`);
});
