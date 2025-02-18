import { z } from "zod";

export const AssignRoleSchema = z.object({
  body: z.object({
    fingerprintId: z.string(),
    role: z.string(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const RemoveRoleSchema = z.object({
  body: z.object({
    fingerprintId: z.string(),
    role: z.string(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

// Type Exports
export type AssignRoleRequest = z.infer<typeof AssignRoleSchema>;
export type RemoveRoleRequest = z.infer<typeof RemoveRoleSchema>;
