import { z } from "zod";
import { ROLE } from "../constants/roles";
import { TagsSchema } from "./common.schema";

export const AddOrUpdateTagsSchema = z.object({
  body: z.object({
    fingerprintId: z.string(),
    tags: TagsSchema,
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const UpdateRolesBasedOnTagsSchema = z.object({
  body: z.object({
    fingerprintId: z.string(),
    tagRules: z.record(
      z.object({
        min: z.number(),
        role: z.enum(Object.values(ROLE) as [string, ...string[]]),
      }),
    ),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});
