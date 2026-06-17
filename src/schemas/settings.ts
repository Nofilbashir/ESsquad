import { z } from "zod";

export const updateSettingsSchema = z.object({
  communityName: z.string().min(1).max(100),
  monthlyFee: z.number().min(1, "Monthly fee must be at least 1"),
  currency: z.string().min(1).max(10),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
