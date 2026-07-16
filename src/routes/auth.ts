import { Router } from 'express';
import { login, register } from '../controllers/authController.js';
import { validator } from '../validation/validator.js';
import { registerBodySchema, loginBodySchema } from '../validation/schemas.js';

const router = Router();

router.post('/register', validator({ body: registerBodySchema }), register);
router.post('/login', validator({ body: loginBodySchema }), login);

export { router };
