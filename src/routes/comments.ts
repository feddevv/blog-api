import { Router } from 'express';
import { getCommentById } from '../controllers/commentsController.js';
import { validator } from '../validation/validator.js';
import { commentsParamsSchema } from '../validation/commentsSchemas.js';

const router = Router();

router.get('/:commentId', validator({ params: commentsParamsSchema }), getCommentById);
router.put('/:commentId', (req, res) => {});
router.delete('/:commentId', (req, res) => {});

export { router };
