import { Router } from 'express';
import { deleteComment, getCommentById, updateComment } from '../controllers/commentsController.js';
import { validator } from '../validation/validator.js';
import { commentsParamsSchema, createCommentBodySchema } from '../validation/commentsSchemas.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.get('/:commentId', validator({ params: commentsParamsSchema }), getCommentById);
router.put(
  '/:commentId',
  validator({ body: createCommentBodySchema, params: commentsParamsSchema }),
  authenticate,
  updateComment,
);
router.delete(
  '/:commentId',
  validator({ params: commentsParamsSchema }),
  authenticate,
  deleteComment,
);

export { router };
