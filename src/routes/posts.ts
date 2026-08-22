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
  imageFileSchema,
  postParamsSchema,
  updatePostBodySchema,
} from '../validation/postsSchemas.js';
import { authenticate, optionalAuthenticate } from '../middleware/authenticate.js';
import { isAdmin, isEditor } from '../middleware/checkRoles.js';
import { router as nestedCommentsRouter } from './nestedComments.js';
import multer from 'multer';

const router = Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get('/', validator({ query: filterPostsQuerySchema }), optionalAuthenticate, getPosts);
router.get('/:postId', validator({ params: postParamsSchema }), optionalAuthenticate, getPostById);
router.post(
  '/',
  upload.single('postImage'),
  validator({ body: createPostBodySchema, file: imageFileSchema }),
  authenticate,
  isAdmin,
  createPost,
);
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
