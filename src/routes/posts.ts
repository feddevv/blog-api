import { Router } from 'express';
import { getPosts } from '../controllers/postsController.js';

const router = Router();

router.get('/', getPosts);
// router.get('/:id', () => {});
// router.get('/admin', () => {});
// router.post('/', () => {});
// router.put('/:id', () => {});
// router.delete('/:id', () => {});

export { router };
