import express from 'express';
import 'dotenv/config';
import { router as authRouter } from './routes/auth.js';
import { errorHandler } from './middleware/error.js';

const app = express();

app.use(express.json());

app.use('/api/auth', authRouter);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, (err) => {
  if (err) {
    console.log(err.message);
  }

  console.log(`Listening to PORT: ${PORT}`);
});
