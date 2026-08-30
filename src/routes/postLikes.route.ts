import { Router } from 'express';
import { togglePostLike } from '../controllers/postLikes.controller.js';
import { validator } from '../validation/validator.js';
import { postParamsSchema } from '../validation/postsSchemas.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router({ mergeParams: true });

router.post('/', validator({ params: postParamsSchema }), authenticate, togglePostLike);

export { router };
