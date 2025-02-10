import { z } from "zod";
import { ROLE } from "../constants";

export const RoleBodySchema = z.object({
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

export const RoleAssignSchema = z.object({
  body: z.object({
    fingerprintId: z.string(),
    role: z.enum(Object.values(ROLE) as [string, ...string[]]),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const RoleRemoveSchema = z.object({
  body: z.object({
    fingerprintId: z.string(),
    role: z.enum(Object.values(ROLE) as [string, ...string[]]),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});
