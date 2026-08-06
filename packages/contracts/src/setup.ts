import { z } from "zod";

export const setupStepSchema = z.object({
  id: z.enum(["initialize", "create-first-asset", "connect-editors", "validate"]),
  label: z.string(),
  description: z.string(),
  complete: z.boolean(),
  action: z.enum(["init", "create-asset", "connect", "validate"]),
  status: z.enum(["done", "current", "pending"])
});

export const setupGuideSchema = z.object({
  chainHome: z.string(),
  steps: z.array(setupStepSchema),
  nextAction: z.enum(["init", "create-asset", "connect", "validate", "done"])
});

export type SetupStep = z.infer<typeof setupStepSchema>;
export type SetupGuide = z.infer<typeof setupGuideSchema>;
