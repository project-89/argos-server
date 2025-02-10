import { z } from "zod";

export const AssignRoleSchema = z.object({
  body: z.object({
    fingerprintId: z.string(),
    role: z.string(),
  }),
});

export const RemoveRoleSchema = z.object({
  body: z.object({
    fingerprintId: z.string(),
    role: z.string(),
  }),
});
