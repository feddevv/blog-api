import { Router } from 'express';
import { getPosts, getPostById, createPost } from '../controllers/postsController.js';
import { validator } from '../validation/validator.js';
import {
  createPostBodySchema,
  filterPostsQuerySchema,
  postParamsSchema,
} from '../validation/schemas.js';
import { authenticate, optionalAuthenticate } from '../middleware/authenticate.js';
import { isAdmin } from '../middleware/checkRoles.js';

const router = Router();

router.get('/', validator({ query: filterPostsQuerySchema }), optionalAuthenticate, getPosts);
router.get('/:id', validator({ params: postParamsSchema }), getPostById);
router.post('/', validator({ body: createPostBodySchema }), authenticate, isAdmin, createPost);
// router.put('/:id', () => {});
// router.delete('/:id', () => {});

export { router };
