import { Router } from 'express';
import { register } from '../controllers/authController.js';
import { validator } from '../validation/validator.js';
import { registerSchema, RegisterBody } from '../validation/schemas.js';

const router = Router();

router.post('/register', validator<RegisterBody>(registerSchema), register);

export { router };
