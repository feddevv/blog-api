import express, { NextFunction, Request, Response } from 'express';
import 'dotenv/config';
import { router as authRouter } from './routes/auth.route.js';
import { router as postsRouter } from './routes/posts.route.js';
import { router as commentsRouter } from './routes/comments.route.js';
import { errorHandler } from './middleware/error.js';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import 'multer';

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

// SWAGGER UI
const swaggerJSON = YAML.load('openapi.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerJSON));

// CORS
const allowedOrigins = [
  'https://blog-client-git-main-nasruls-projects-60f61b8e.vercel.app',
  'https://blog-client-ipiiov36g-nasruls-projects-60f61b8e.vercel.app',
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (!allowedOrigins.includes(origin)) return callback(new Error('Not allowed by CORS'));

      return callback(null, true);
    },
    credentials: true,
  }),
);

// COOKIE PARSER
app.use(cookieParser());

app.use('/api/auth', authRouter);
app.use('/api/posts', postsRouter);
app.use('/api/comments', commentsRouter);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, (err) => {
  if (err) {
    console.log(err.message);
  }

  console.log(`Listening to PORT: ${PORT}`);
});
