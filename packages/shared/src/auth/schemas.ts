import { z } from 'zod';

export const displayNameSchema = z.string().min(3).max(24);

/**
 * Longueur minimale 12 (claude.md §5). La vérification contre une liste de mots de passe
 * compromis (zxcvbn) se fait côté service, pas dans ce schéma — elle nécessite un appel
 * à une bibliothèque externe, pas une simple contrainte synchrone.
 */
const passwordSchema = z.string().min(12).max(128);

export const registerSchema = z.object({
  email: z.email(),
  password: passwordSchema,
  displayName: displayNameSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email(),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
