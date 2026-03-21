import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().email();
const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(256, "Password is too long.");

export const signUpSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your name.").max(80, "Name is too long."),
    workspaceName: z
      .string()
      .trim()
      .min(2, "Enter a workspace name.")
      .max(80, "Workspace name is too long."),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required."),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80, "Name is too long."),
  email: emailSchema,
});

export const updateWorkspaceSchema = z.object({
  workspaceName: z
    .string()
    .trim()
    .min(2, "Enter a workspace name.")
    .max(80, "Workspace name is too long."),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    nextPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.nextPassword === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const requestPasswordResetSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required."),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
