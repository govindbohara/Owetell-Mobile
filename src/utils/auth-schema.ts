import { z } from "zod";

const email = z
  .string()
  .trim()
  .min(1, "Enter your email and password.")
  .email("Enter a valid email address.");

const loginPassword = z.string().min(1, "Enter your email and password.");

export const loginSchema = z.object({
  email,
  password: loginPassword,
});

export const signupSchema = z
  .object({
    email,
    password: z.string().min(6, "Password must be at least 6 characters."),
    confirmPassword: z.string().min(1, "Enter your email and password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });
