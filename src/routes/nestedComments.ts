import { Router } from 'express';
import { createComment, getPostComments } from '../controllers/commentsController.js';
import { validator } from '../validation/validator.js';
import { postParamsSchema } from '../validation/postsSchemas.js';
import { createCommentBodySchema } from '../validation/commentsSchemas.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router({ mergeParams: true });

router.get('/', validator({ params: postParamsSchema }), getPostComments);
router.post('/', validator({ body: createCommentBodySchema }), authenticate, createComment);

export { router };
