import { z } from "zod";
import { ROLE } from "../constants";

export const createRoleSchema = z.object({
  fingerprintId: z
    .string({
      required_error: "Fingerprint ID is required",
    })
    .min(1, "Fingerprint ID cannot be empty"),
  role: z.enum(Object.values(ROLE) as [string, ...string[]], {
    required_error: "Role is required",
    invalid_type_error: "Invalid role",
  }),
});

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
export type CreateRoleRequest = z.infer<typeof createRoleSchema>;
