import { Router } from 'express';
import {
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
} from '../controllers/postsController.js';
import { validator } from '../validation/validator.js';
import {
  createPostBodySchema,
  filterPostsQuerySchema,
  postParamsSchema,
  updatePostBodySchema,
} from '../validation/schemas.js';
import { authenticate, optionalAuthenticate } from '../middleware/authenticate.js';
import { isAdmin, isEditor } from '../middleware/checkRoles.js';
import { router as nestedCommentsRouter } from './nestedComments.js';

const router = Router();

router.get('/', validator({ query: filterPostsQuerySchema }), optionalAuthenticate, getPosts);
router.get('/:postId', validator({ params: postParamsSchema }), optionalAuthenticate, getPostById);
router.post('/', validator({ body: createPostBodySchema }), authenticate, isAdmin, createPost);
router.put(
  '/:postId',
  validator({ body: updatePostBodySchema, params: postParamsSchema }),
  authenticate,
  isEditor,
  updatePost,
);
router.delete(
  '/:postId',
  validator({ params: postParamsSchema }),
  authenticate,
  isAdmin,
  deletePost,
);

router.use('/:postId/comments', nestedCommentsRouter);

export { router };
