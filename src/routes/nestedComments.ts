import { Router } from 'express';
import { getPostComments } from '../controllers/commentsController.js';
import { validator } from '../validation/validator.js';
import { postParamsSchema } from '../validation/postsSchemas.js';

const router = Router({ mergeParams: true });

router.get('/', validator({ params: postParamsSchema }), getPostComments);
router.post('/', (req, res) => {});

export { router };
