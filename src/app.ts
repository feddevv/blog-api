import express, { NextFunction, Request, Response } from 'express';
import 'dotenv/config';
import { router as authRouter } from './routes/auth.js';
import { HttpError } from './errors/HttpError.js';

const app = express();

app.use(express.json());

app.use('/api/auth', authRouter);

app.use((err: HttpError | Error, req: Request, res: Response, next: NextFunction) => {
  let statusCode: number | null = null;
  const message = err.message || 'Something went wrong';

  if (err instanceof HttpError) {
    statusCode = err.statusCode;
  }

  res.status(statusCode ?? 500).json({
    message,
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, (err) => {
  if (err) {
    console.log(err.message);
  }

  console.log(`Listening to PORT: ${PORT}`);
});
