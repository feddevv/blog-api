import { Router } from 'express';
import { createComment, getPostComments } from '../controllers/commentsController.js';
import { validator } from '../validation/validator.js';
import { postParamsSchema } from '../validation/postsSchemas.js';
import { createCommentBodySchema } from '../validation/commentsSchemas.js';
import { authenticate, optionalAuthenticate } from '../middleware/authenticate.js';

const router = Router({ mergeParams: true });

router.get('/', validator({ params: postParamsSchema }), optionalAuthenticate, getPostComments);
router.post(
  '/',
  validator({ body: createCommentBodySchema, params: postParamsSchema }),
  authenticate,
  createComment,
);

export { router };
