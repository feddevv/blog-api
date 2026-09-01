import { Router } from 'express';
import { toggleCommentLike } from '../controllers/commentLikes.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validator } from '../validation/validator.js';
import { commentParamsSchema } from '../validation/commentsSchemas.js';

const router = Router({ mergeParams: true });

router.post('/', authenticate, validator({ params: commentParamsSchema }), toggleCommentLike);

export { router };
