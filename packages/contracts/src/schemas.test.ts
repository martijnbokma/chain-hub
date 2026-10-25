import { describe, expect, it } from "vitest";

import {
  aiConfigSchema,
  aiSecretsSchema,
  auditAssetInputSchema,
  auditAssetResultSchema,
  classifyAssetInputSchema,
  classifyAssetResultSchema,
  draftAssetInputSchema,
  draftAssetResultSchema,
  improveAssetInputSchema,
  improveAssetResultSchema,
  updateAiSettingsInputSchema,
  aiSettingsPublicSchema,
  DEFAULT_AI_MODELS,
  DEFAULT_OLLAMA_BASE_URL
} from "./ai.js";
import {
  agentsSkillsDriftSchema,
  overviewSchema,
  integrationSchema,
  validationSchema
} from "./hub.js";
import {
  captureEventSchema,
  captureInputSchema,
  learningsTimelineSchema,
  reflectionReportSchema
} from "./learning.js";
import { setupGuideSchema, setupStepSchema } from "./setup.js";

describe("Contracts schemas", () => {
  describe("ai schemas", () => {
    it("validates default aiConfig", () => {
      const parsed = aiConfigSchema.parse({
        version: 1,
        provider: "ollama",
        models: DEFAULT_AI_MODELS,
        ollamaBaseUrl: DEFAULT_OLLAMA_BASE_URL
      });
      expect(parsed.provider).toBe("ollama");
      expect(parsed.models.anthropic).toBeDefined();
    });

    it("validates aiSecrets", () => {
      const secrets = aiSecretsSchema.parse({
        version: 1,
        anthropicApiKey: "sk-ant-test",
        openaiApiKey: "sk-proj-test"
      });
      expect(secrets.anthropicApiKey).toBe("sk-ant-test");
    });

    it("validates aiSettingsPublic", () => {
      const publicSettings = aiSettingsPublicSchema.parse({
        provider: "anthropic",
        models: DEFAULT_AI_MODELS,
        ollamaBaseUrl: DEFAULT_OLLAMA_BASE_URL,
        anthropicApiKeyConfigured: true,
        openaiApiKeyConfigured: false,
        mistralApiKeyConfigured: false,
        geminiApiKeyConfigured: false,
        groqApiKeyConfigured: false,
        openrouterApiKeyConfigured: false,
        deepseekApiKeyConfigured: false,
        cerebrasApiKeyConfigured: false
      });
      expect(publicSettings.anthropicApiKeyConfigured).toBe(true);
    });

    it("validates draft, classify, audit, improve schemas", () => {
      const draftInput = draftAssetInputSchema.parse({
        intent: "A skill for generating git hooks",
        kind: "skills"
      });
      expect(draftInput.kind).toBe("skills");

      const draftResult = draftAssetResultSchema.parse({
        content: "---\nname: git-hooks\n---\nBody",
        suggestedName: "git-hooks-generator",
        recommendedKind: "skills",
        reason: "Procedure with triggers"
      });
      expect(draftResult.recommendedKind).toBe("skills");

      const classifyInput = classifyAssetInputSchema.parse({
        kind: "prompts",
        name: "test",
        content: "How to run backups"
      });
      expect(classifyInput.kind).toBe("prompts");

      const classifyResult = classifyAssetResultSchema.parse({
        currentKind: "prompts",
        recommendedKind: "workflows",
        matchesCurrent: false,
        reason: "Sequential steps",
        suggestedName: "run-backups"
      });
      expect(classifyResult.recommendedKind).toBe("workflows");

      const auditInput = auditAssetInputSchema.parse({
        kind: "skills",
        name: "test-skill",
        content: "# Test Skill\n"
      });
      expect(auditInput.kind).toBe("skills");

      const auditResult = auditAssetResultSchema.parse({
        summary: "All good",
        findings: []
      });
      expect(auditResult.summary).toBe("All good");

      const improveInput = improveAssetInputSchema.parse({
        kind: "skills",
        name: "test-skill",
        content: "# Test",
        findings: [
          {
            severity: "high",
            title: "Add examples",
            detail: "Include a worked example in the skill."
          }
        ]
      });
      expect(improveInput.findings).toHaveLength(1);

      const improveResult = improveAssetResultSchema.parse({
        content: "# Test\n\n## Examples"
      });
      expect(improveResult.content).toContain("## Examples");

      const updateSettings = updateAiSettingsInputSchema.parse({
        provider: "openai",
        openaiApiKey: "sk-key"
      });
      expect(updateSettings.provider).toBe("openai");
    });
  });

  describe("hub schemas", () => {
    it("validates overview schema", () => {
      const drift = agentsSkillsDriftSchema.parse({
        lockPath: "/test/skills-lock.json",
        missingNames: ["test-skill"],
        missingCount: 1
      });
      expect(drift.missingCount).toBe(1);

      const overview = overviewSchema.parse({
        chainHome: "/Users/test/.chain-hub",
        initializedAt: "2026-09-23T10:00:00Z",
        assetCounts: { skills: 5, agents: 2, workflows: 1, rules: 3, prompts: 4 },
        health: { initialized: true, issues: [] },
        storage: { indexedAssets: 15 },
        agentsSkillsDrift: drift
      });
      expect(overview.health.initialized).toBe(true);
    });

    it("validates integration and validation schemas", () => {
      const integration = integrationSchema.parse({
        id: "cursor",
        label: "Cursor",
        targetPaths: ["/test/.cursor/skills"],
        installed: true,
        connected: true,
        mode: "managed",
        supportedKinds: ["skills", "rules"],
        unsupportedKinds: ["agents", "workflows", "prompts"]
      });
      expect(integration.connected).toBe(true);

      const validation = validationSchema.parse({
        ok: true,
        issues: [],
        checks: [{ id: "db", label: "Database", status: "pass" }]
      });
      expect(validation.ok).toBe(true);
    });
  });

  describe("learning schemas", () => {
    it("validates capture event and timeline", () => {
      const event = captureEventSchema.parse({
        id: "evt-1",
        type: "success",
        skill: "react-best-practices",
        summary: "Worked perfectly",
        capturedAt: "2026-09-23T12:00:00Z"
      });
      expect(event.type).toBe("success");

      const input = captureInputSchema.parse({
        type: "note",
        skill: "testing",
        summary: "Remember to mock fs"
      });
      expect(input.type).toBe("note");

      const timeline = learningsTimelineSchema.parse({
        totalEvents: 1,
        returnedEvents: 1,
        offset: 0,
        skippedLines: 0,
        logPath: "/test/events.jsonl",
        events: [event],
        status: "active"
      });
      expect(timeline.status).toBe("active");

      const report = reflectionReportSchema.parse({
        generatedAt: "2026-09-23T12:00:00Z",
        totalEvents: 1,
        totalSkills: 1,
        skills: [
          {
            skill: "testing",
            totalEvents: 1,
            successCount: 0,
            failureCount: 0,
            correctionCount: 0,
            noteCount: 1,
            openFailureCount: 0,
            openCorrectionCount: 0,
            resolvedAt: null,
            firstSeen: "2026-09-23T12:00:00Z",
            lastSeen: "2026-09-23T12:00:00Z",
            trend: "new",
            recentEvents: [event]
          }
        ],
        logPath: "/test/events.jsonl"
      });
      expect(report.totalSkills).toBe(1);
    });
  });

  describe("setup schemas", () => {
    it("validates setupStep and setupGuide", () => {
      const step = setupStepSchema.parse({
        id: "initialize",
        label: "Initialize",
        description: "Init hub folder",
        complete: true,
        action: "init",
        status: "done"
      });
      expect(step.complete).toBe(true);

      const guide = setupGuideSchema.parse({
        chainHome: "/test/.chain-hub",
        steps: [step],
        nextAction: "done"
      });
      expect(guide.nextAction).toBe("done");
    });
  });
});
