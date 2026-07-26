export type SetupStep = {
  id: string;
  label: string;
  description: string;
  complete: boolean;
  action: "init" | "create-asset" | "connect" | "validate";
  status: "done" | "current" | "pending";
};

export type SetupGuide = {
  chainHome: string;
  nextAction: "init" | "create-asset" | "connect" | "validate" | "done";
  steps: SetupStep[];
};