export type CaptureEventType = "success" | "failure" | "correction" | "note";

export type CaptureEvent = {
  id: string;
  type: CaptureEventType;
  skill: string;
  summary: string;
  capturedAt: string;
};

export type LearningsTimeline = {
  totalEvents: number;
  returnedEvents: number;
  offset: number;
  skippedLines: number;
  logPath: string;
  events: CaptureEvent[];
  status: "empty" | "active";
};

export type SkillReflection = {
  skill: string;
  totalEvents: number;
  successCount: number;
  failureCount: number;
  correctionCount: number;
  noteCount: number;
  firstSeen: string;
  lastSeen: string;
  trend: "improving" | "struggling" | "stable" | "new";
  recentEvents: CaptureEvent[];
};

export type ReflectionReport = {
  generatedAt: string;
  totalEvents: number;
  totalSkills: number;
  skills: SkillReflection[];
  logPath: string;
};