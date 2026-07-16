import { Router } from 'express';
import { login, register } from '../controllers/authController.js';
import { validator } from '../validation/validator.js';
import { registerSchema, RegisterBody, loginSchema } from '../validation/schemas.js';

const router = Router();

router.post('/register', validator<RegisterBody>(registerSchema), register);
router.post('/login', validator(loginSchema), login);

export { router };
