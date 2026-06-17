import { z } from "zod";

export const giveawayRecipientSchema = z.object({
  memberId: z.string().min(1, "Select a winner"),
  itemName: z.string().min(1, "Item name is required").max(100),
  itemValue: z.number().min(0).default(0),
});

export const createGiveawaySchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020),
  title: z.string().min(1, "Title is required").max(100),
  recipients: z.array(giveawayRecipientSchema).min(1, "Add at least one prize"),
  notes: z.string().max(500).optional(),
});

export const distributeGiveawaySchema = z.object({
  giveawayId: z.string().min(1),
});

export type CreateGiveawayInput = z.infer<typeof createGiveawaySchema>;
