import { z } from "zod";
import { ROLE } from "../constants/roles";

// Role schemas
export const roleBodySchema = z.object({
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

export const roleSchema = z.object({
  body: roleBodySchema,
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});
