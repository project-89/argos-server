import { z } from "zod";

export const PresenceUpdateSchema = z.object({
  body: z.object({
    status: z.string(),
  }),
});

export const PresenceGetSchema = z.object({
  params: z.object({
    fingerprintId: z.string(),
  }),
});

export const PresenceActivitySchema = z.object({
  params: z.object({
    fingerprintId: z.string(),
  }),
});
