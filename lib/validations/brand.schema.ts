import { z } from "zod";

export const brandSchema = z.object({
  name: z.string().min(2).max(100),
  arnNumber: z.string().max(20).optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color"),
  phone: z.string().max(15).optional(),
  email: z.string().email().optional().or(z.literal("")),
  disclaimer: z.string().max(5000).optional(),
});

export type BrandInput = z.infer<typeof brandSchema>;
