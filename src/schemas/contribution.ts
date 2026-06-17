import { z } from "zod";

export const markPaymentSchema = z.object({
  memberId: z.string().min(1),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020),
  status: z.enum(["PAID", "UNPAID"]),
  amount: z.number().min(1).optional(),
});

export const bulkMarkPaymentSchema = z.object({
  memberIds: z.array(z.string().min(1)).min(1),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020),
  status: z.enum(["PAID", "UNPAID"]),
});

export type MarkPaymentInput = z.infer<typeof markPaymentSchema>;
export type BulkMarkPaymentInput = z.infer<typeof bulkMarkPaymentSchema>;
