import { z } from "zod";

export const clientSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(15).optional(),
  pan: z.string().max(10).optional(),
  riskProfile: z.enum(["conservative", "moderate", "aggressive"]).optional(),
  notes: z.string().max(2000).optional(),
});

export type ClientInput = z.infer<typeof clientSchema>;
