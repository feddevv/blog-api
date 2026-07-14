import express, { Request, Response } from 'express';
import 'dotenv/config';

const app = express();

app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Hello World!',
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, (err) => {
  if (err) {
    console.log(err.message);
  }

  console.log(`Listening to PORT: ${PORT}`);
});
