import { z } from "zod";

export const uploadSchema = z.object({
  clientId: z.string().cuid(),
  casPassword: z.string().optional(),
});

export type UploadInput = z.infer<typeof uploadSchema>;
