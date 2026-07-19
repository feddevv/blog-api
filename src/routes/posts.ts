import { Router } from 'express';
import { getPosts, getPostById, createPost, updatePost } from '../controllers/postsController.js';
import { validator } from '../validation/validator.js';
import {
  createPostBodySchema,
  filterPostsQuerySchema,
  postParamsSchema,
  updatePostBodySchema,
} from '../validation/schemas.js';
import { authenticate, optionalAuthenticate } from '../middleware/authenticate.js';
import { isAdmin, isEditor } from '../middleware/checkRoles.js';

const router = Router();

router.get('/', validator({ query: filterPostsQuerySchema }), optionalAuthenticate, getPosts);
router.get('/:id', validator({ params: postParamsSchema }), optionalAuthenticate, getPostById);
router.post('/', validator({ body: createPostBodySchema }), authenticate, isAdmin, createPost);
router.put(
  '/:id',
  validator({ body: updatePostBodySchema, params: postParamsSchema }),
  authenticate,
  isEditor,
  updatePost,
);
// router.delete('/:id', () => {});

export { router };
