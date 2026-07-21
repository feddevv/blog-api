import express, { NextFunction, Request, Response } from 'express';
import 'dotenv/config';
import { router as authRouter } from './routes/auth.js';
import { router as postsRouter } from './routes/posts.js';
import { router as commentsRouter } from './routes/comments.js';
import { errorHandler } from './middleware/error.js';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

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
