import { Router } from 'express';
import {
  deleteComment,
  getCommentById,
  updateComment,
} from '../controllers/comments.controller.js';
import { validator } from '../validation/validator.js';
import { commentParamsSchema, updateCommentBodySchema } from '../validation/commentsSchemas.js';
import { authenticate, optionalAuthenticate } from '../middleware/authenticate.js';
import { router as commentLikesRouter } from './commentLikes.route.js';

const router = Router();

router.get(
  '/:commentId',
  optionalAuthenticate,
  validator({ params: commentParamsSchema }),
  getCommentById,
);
router.put(
  '/:commentId',
  validator({ body: updateCommentBodySchema, params: commentParamsSchema }),
  authenticate,
  updateComment,
);
router.delete(
  '/:commentId',
  validator({ params: commentParamsSchema }),
  authenticate,
  deleteComment,
);

router.use('/:commentId/likes', commentLikesRouter);

export { router };
