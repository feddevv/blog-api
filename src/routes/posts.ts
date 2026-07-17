import { Router } from 'express';
import { getPosts } from '../controllers/postsController.js';
import { validator } from '../validation/validator.js';
import { filterPostsQuerySchema } from '../validation/schemas.js';
import { optionalAuthenticate } from '../middleware/authenticate.js';

const router = Router();

router.get('/', validator({ query: filterPostsQuerySchema }), optionalAuthenticate, getPosts);
// router.get('/:id', () => {});
// router.post('/', () => {});
// router.put('/:id', () => {});
// router.delete('/:id', () => {});

export { router };
