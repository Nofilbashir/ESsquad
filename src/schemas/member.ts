import { z } from "zod";

export const createMemberSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  phone: z.string().min(10, "Phone must be at least 10 digits").max(15),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  joinDate: z.string().min(1, "Join date is required"),
});

export const updateMemberSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().min(10).max(15).optional(),
  email: z.string().email().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const resetMemberPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
