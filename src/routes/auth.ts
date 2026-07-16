import { Router } from 'express';
import { login, register } from '../controllers/authController.js';
import { validator } from '../validation/validator.js';
import { registerSchema, loginSchema } from '../validation/schemas.js';

const router = Router();

router.post('/register', validator({ body: registerSchema.shape.body }), register);
router.post('/login', validator({ body: loginSchema.shape.body }), login);

export { router };
