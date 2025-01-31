import { z } from "zod";

export const TagsSchema = z.record(z.number());
