import { z } from 'zod';
import { isPasswordValid } from './passwordRules';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const emailField = z.string().trim().regex(EMAIL_RE, 'Ingresá un email válido');

const newPassword = z.string().refine(isPasswordValid, 'La contraseña no cumple los requisitos');

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Ingresá tu contraseña'),
});

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Ingresá tu nombre'),
    email: emailField,
    password: newPassword,
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((v) => v === true, 'Tenés que aceptar los términos'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  });

export const forgotSchema = z.object({ email: emailField });

export const resetSchema = z
  .object({ password: newPassword, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  });

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
export type ForgotForm = z.infer<typeof forgotSchema>;
export type ResetForm = z.infer<typeof resetSchema>;
