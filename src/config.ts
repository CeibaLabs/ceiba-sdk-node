import { z } from "zod";

export const ceibaSdkConfigSchema = z.object({
  runtimeBaseUrl: z.string().url(),
  projectId: z.string().uuid(),
  projectSecret: z.string().min(1),
});

export type CeibaSdkConfig = z.infer<typeof ceibaSdkConfigSchema>;

export function parseCeibaSdkConfig(input: unknown): CeibaSdkConfig {
  return ceibaSdkConfigSchema.parse(input);
}
