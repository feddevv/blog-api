import { Router } from 'express';
import { getPosts, getPostById } from '../controllers/postsController.js';
import { validator } from '../validation/validator.js';
import { filterPostsQuerySchema, postParamsSchema } from '../validation/schemas.js';
import { optionalAuthenticate } from '../middleware/authenticate.js';

const router = Router();

router.get('/', validator({ query: filterPostsQuerySchema }), optionalAuthenticate, getPosts);
router.get('/:id', validator({ params: postParamsSchema }), getPostById);
// router.post('/', () => {});
// router.put('/:id', () => {});
// router.delete('/:id', () => {});

export { router };
