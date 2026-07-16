import { Router } from 'express';
import { getPosts } from '../controllers/postsController.js';
import { validator } from '../validation/validator.js';
import { filterPostsQuerySchema } from '../validation/schemas.js';

const router = Router();

router.get('/', validator({ query: filterPostsQuerySchema }), getPosts);
// router.get('/:id', () => {});
// router.get('/admin', () => {});
// router.post('/', () => {});
// router.put('/:id', () => {});
// router.delete('/:id', () => {});

export { router };
