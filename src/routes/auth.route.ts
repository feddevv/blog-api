import { Router } from 'express';
import { me, login, register, refresh, logout } from '../controllers/auth.controller.js';
import { validator } from '../validation/validator.js';
import { registerBodySchema, loginBodySchema } from '../validation/authSchemas.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.post('/register', validator({ body: registerBodySchema }), register);
router.post('/login', validator({ body: loginBodySchema }), login);
router.get('/me', authenticate, me);
router.post('/refresh', refresh);
router.post('/logout', logout);

export { router };
