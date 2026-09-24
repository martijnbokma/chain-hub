import { afterEach, describe, expect, it, vi } from "vitest";

import { aiConfigSchema, type AiSecrets } from "@chain-hub/contracts";

import { AiProviderError, auditExistingAsset, classifyExistingAsset, generateAssetDraft, improveExistingAsset } from "./ai-providers.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

function config(provider: "anthropic" | "openai" | "mistral" | "ollama") {
  return aiConfigSchema.parse({
    version: 1,
    provider,
    models: {
      anthropic: "claude-sonnet-4-5",
      openai: "gpt-4o-mini",
      mistral: "mistral-small-latest",
      ollama: "llama3.2"
    },
    ollamaBaseUrl: "http://127.0.0.1:11434"
  });
}

describe("generateAssetDraft", () => {
  it("throws when Anthropic key is missing", async () => {
    await expect(
      generateAssetDraft({
        config: config("anthropic"),
        secrets: { version: 1 },
        input: { intent: "Write a PR review prompt", kind: "prompts" }
      })
    ).rejects.toBeInstanceOf(AiProviderError);
  });

  it("calls Anthropic and returns content", async () => {
    globalThis.fetch = vi.fn(async () =>
      Response.json({
        content: [{ type: "text", text: "You are a careful PR reviewer." }]
      })
    ) as typeof fetch;

    const secrets: AiSecrets = { version: 1, anthropicApiKey: "sk-ant-test" };
    const result = await generateAssetDraft({
      config: config("anthropic"),
      secrets,
      input: { intent: "Review pull requests for bugs", kind: "prompts" }
    });

    expect(result.content).toContain("PR reviewer");
    expect(result.recommendedKind).toBe("prompts");
    expect(result.suggestedName).toBeTruthy();
    expect(globalThis.fetch).toHaveBeenCalledOnce();
  });

  it("calls OpenAI and returns content", async () => {
    globalThis.fetch = vi.fn(async () =>
      Response.json({
        choices: [{ message: { content: "OpenAI drafted prompt" } }]
      })
    ) as typeof fetch;

    const result = await generateAssetDraft({
      config: config("openai"),
      secrets: { version: 1, openaiApiKey: "sk-test" },
      input: { intent: "Summarize meeting notes", name: "meeting-notes", kind: "prompts" }
    });

    expect(result.content).toBe("OpenAI drafted prompt");
    expect(result.recommendedKind).toBe("prompts");
    expect(result.suggestedName).toBe("summarize-meeting-notes");
  });

  it("calls Mistral and returns content", async () => {
    globalThis.fetch = vi.fn(async (url) => {
      expect(String(url)).toContain("api.mistral.ai");
      return Response.json({
        choices: [{ message: { content: "Mistral drafted prompt" } }]
      });
    }) as typeof fetch;

    const result = await generateAssetDraft({
      config: config("mistral"),
      secrets: { version: 1, mistralApiKey: "mistral-test" },
      input: { intent: "Write a concise PR summary", kind: "prompts" }
    });

    expect(result.content).toBe("Mistral drafted prompt");
  });

  it("throws when Mistral key is missing", async () => {
    await expect(
      generateAssetDraft({
        config: config("mistral"),
        secrets: { version: 1 },
        input: { intent: "Anything", kind: "prompts" }
      })
    ).rejects.toMatchObject({
      message: expect.stringMatching(/Mistral API key/i)
    });
  });

  it("calls Ollama and returns content", async () => {
    globalThis.fetch = vi.fn(async () =>
      Response.json({
        message: { content: "Ollama drafted prompt" }
      })
    ) as typeof fetch;

    const result = await generateAssetDraft({
      config: config("ollama"),
      secrets: { version: 1 },
      input: { intent: "Generate commit messages", kind: "prompts" }
    });

    expect(result.content).toBe("Ollama drafted prompt");
    expect(String((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0])).toContain(
      "/api/chat"
    );
  });

  it("maps Ollama network failures to AiProviderError", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    }) as typeof fetch;

    await expect(
      generateAssetDraft({
        config: config("ollama"),
        secrets: { version: 1 },
        input: { intent: "Anything", kind: "prompts" }
      })
    ).rejects.toMatchObject({
      name: "AiProviderError",
      message: expect.stringContaining("Ollama is unreachable")
    });
  });

  it("maps cloud provider network failures to a readable 502", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;

    await expect(
      generateAssetDraft({
        config: config("openai"),
        secrets: { version: 1, openaiApiKey: "sk-test" },
        input: { intent: "Anything", kind: "prompts" }
      })
    ).rejects.toMatchObject({ name: "AiProviderError", status: 502, message: expect.stringMatching(/Could not reach OpenAI/) });
  });

  it("maps provider timeouts to a 504 AiProviderError", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
    }) as typeof fetch;

    await expect(
      generateAssetDraft({
        config: config("anthropic"),
        secrets: { version: 1, anthropicApiKey: "sk-ant-test" },
        input: { intent: "Anything", kind: "prompts" }
      })
    ).rejects.toMatchObject({ name: "AiProviderError", status: 504, message: expect.stringMatching(/timed out/) });
  });

  it("gives Ollama a longer timeout than cloud providers", async () => {
    const timeouts: number[] = [];
    const realTimeout = AbortSignal.timeout.bind(AbortSignal);
    vi.spyOn(AbortSignal, "timeout").mockImplementation((ms: number) => {
      timeouts.push(ms);
      return realTimeout(ms);
    });
    globalThis.fetch = vi.fn(async () => Response.json({ message: { content: "Draft body" } })) as typeof fetch;

    await generateAssetDraft({
      config: config("ollama"),
      secrets: { version: 1 },
      input: { intent: "Anything", kind: "prompts" }
    }).catch(() => undefined);

    expect(timeouts.length).toBeGreaterThan(0);
    expect(Math.min(...timeouts)).toBeGreaterThan(60_000);
  });

  it("turns Anthropic billing errors into a friendly message", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          type: "error",
          error: {
            type: "invalid_request_error",
            message:
              "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits."
          }
        }),
        { status: 400 }
      )
    ) as typeof fetch;

    await expect(
      generateAssetDraft({
        config: config("anthropic"),
        secrets: { version: 1, anthropicApiKey: "sk-ant-test" },
        input: { intent: "Draft a prompt", kind: "prompts" }
      })
    ).rejects.toMatchObject({
      name: "AiProviderError",
      message: expect.stringMatching(/credits|billing/i)
    });

    await expect(
      generateAssetDraft({
        config: config("anthropic"),
        secrets: { version: 1, anthropicApiKey: "sk-ant-test" },
        input: { intent: "Draft a prompt", kind: "prompts" }
      })
    ).rejects.not.toMatchObject({
      message: expect.stringContaining('"type":"error"')
    });
  });

  it("turns OpenAI auth errors into a friendly message", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          error: { message: "Incorrect API key provided", type: "invalid_request_error" }
        }),
        { status: 401 }
      )
    ) as typeof fetch;

    await expect(
      generateAssetDraft({
        config: config("openai"),
        secrets: { version: 1, openaiApiKey: "sk-bad" },
        input: { intent: "Draft a prompt", kind: "prompts" }
      })
    ).rejects.toMatchObject({
      message: expect.stringMatching(/API key/i)
    });
  });

  it("uses skill-oriented instructions when kind is skills", async () => {
    globalThis.fetch = vi.fn(async (_url, init) => {
      const body = JSON.parse(String((init as RequestInit).body)) as {
        system?: string;
        messages?: Array<{ role: string; content: string }>;
      };
      const system = body.system ?? body.messages?.find((message) => message.role === "system")?.content ?? "";
      expect(system).toMatch(/SKILL\.md/i);
      return Response.json({
        content: [{ type: "text", text: "---\nname: a11y-audit\ndescription: Audit a11y\n---\n\n# A11y" }]
      });
    }) as typeof fetch;

    const result = await generateAssetDraft({
      config: config("anthropic"),
      secrets: { version: 1, anthropicApiKey: "sk-ant-test" },
      input: { intent: "Audit React accessibility", kind: "skills" }
    });

    expect(result.content).toContain("name: a11y-audit");
    expect(result.recommendedKind).toBe("skills");
  });

  it("classifies kind then drafts when kind is auto", async () => {
    let call = 0;
    globalThis.fetch = vi.fn(async (_url, init) => {
      call += 1;
      const body = JSON.parse(String((init as RequestInit).body)) as {
        system?: string;
        messages?: Array<{ role: string; content: string }>;
      };
      const system = body.system ?? body.messages?.find((message) => message.role === "system")?.content ?? "";

      if (call === 1) {
        expect(system).toMatch(/classify/i);
        return Response.json({
          content: [
            {
              type: "text",
              text: '```json\n{"kind":"workflows","reason":"Ordered release steps fit a workflow.","suggestedName":"release-checklist"}\n```'
            }
          ]
        });
      }

      expect(system).toMatch(/workflows/i);
      return Response.json({
        content: [{ type: "text", text: "# Release checklist\n\n1. Version\n2. Tag" }]
      });
    }) as typeof fetch;

    const result = await generateAssetDraft({
      config: config("anthropic"),
      secrets: { version: 1, anthropicApiKey: "sk-ant-test" },
      input: { intent: "Ship a release with changelog and tags", kind: "auto" }
    });

    expect(result.recommendedKind).toBe("workflows");
    expect(result.reason).toMatch(/workflow/i);
    expect(result.suggestedName).toBe("release-checklist");
    expect(result.content).toContain("Release checklist");
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("classifies an existing asset without drafting content", async () => {
    globalThis.fetch = vi.fn(async (_url, init) => {
      const body = JSON.parse(String((init as RequestInit).body)) as {
        system?: string;
        messages?: Array<{ role: string; content: string }>;
      };
      const system = body.system ?? body.messages?.find((message) => message.role === "system")?.content ?? "";
      expect(system).toMatch(/assess an existing/i);
      return Response.json({
        content: [
          {
            type: "text",
            text: '{"kind":"skills","reason":"Reusable agent procedure with triggers.","suggestedName":"review-pr"}'
          }
        ]
      });
    }) as typeof fetch;

    const result = await classifyExistingAsset({
      config: config("anthropic"),
      secrets: { version: 1, anthropicApiKey: "sk-ant-test" },
      currentKind: "prompts",
      name: "review-pr",
      content: "Review pull requests for security issues."
    });

    expect(result.currentKind).toBe("prompts");
    expect(result.recommendedKind).toBe("skills");
    expect(result.matchesCurrent).toBe(false);
    expect(result.reason).toMatch(/procedure/i);
    expect(result.suggestedName).toBe("review-pr");
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("audits an existing asset into severity-tagged findings", async () => {
    globalThis.fetch = vi.fn(async (_url, init) => {
      const body = JSON.parse(String((init as RequestInit).body)) as {
        system?: string;
        messages?: Array<{ role: string; content: string }>;
      };
      const system = body.system ?? body.messages?.find((message) => message.role === "system")?.content ?? "";
      expect(system).toMatch(/audit an existing/i);
      return Response.json({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              summary: "Solid core idea; tighten triggers and constraints.",
              findings: [
                {
                  severity: "high",
                  title: "Missing triggers",
                  detail: "Add explicit when-to-use phrases so agents know when to load this skill."
                },
                {
                  severity: "medium",
                  title: "Vague success criteria",
                  detail: "Define what a good outcome looks like in one checklist."
                }
              ]
            })
          }
        ]
      });
    }) as typeof fetch;

    const result = await auditExistingAsset({
      config: config("anthropic"),
      secrets: { version: 1, anthropicApiKey: "sk-ant-test" },
      kind: "skills",
      name: "review-pr",
      content: "# Review\n\nLook at the PR."
    });

    expect(result.summary).toMatch(/tighten/i);
    expect(result.findings).toHaveLength(2);
    expect(result.findings[0]?.severity).toBe("high");
    expect(result.findings[0]?.title).toMatch(/triggers/i);
  });

  it("accepts an empty findings list when the asset already meets the bar", async () => {
    globalThis.fetch = vi.fn(async () =>
      Response.json({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              summary: "Meets skill best practices; no material gaps.",
              findings: []
            })
          }
        ]
      })
    ) as typeof fetch;

    const result = await auditExistingAsset({
      config: config("anthropic"),
      secrets: { version: 1, anthropicApiKey: "sk-ant-test" },
      kind: "skills",
      name: "review-pr",
      content:
        "---\nname: review-pr\ndescription: Review PRs for security. Use when auditing pull requests.\n---\n\n# Review PR\n\n1. Check auth\n2. Report findings"
    });

    expect(result.summary).toMatch(/no material/i);
    expect(result.findings).toEqual([]);
  });

  it("feeds field reports to the auditor and tags learning-sourced findings", async () => {
    globalThis.fetch = vi.fn(async (_url, init) => {
      const body = JSON.parse(String((init as RequestInit).body)) as {
        system?: string;
        messages?: Array<{ role: string; content: string }>;
      };
      const user = body.messages?.find((message) => message.role === "user")?.content ?? "";
      expect(body.system).toMatch(/Field reports:/);
      expect(user).toContain("Field reports from real use:");
      expect(user).toContain("1. [correction, 2026-09-01] Misses SVG targets in click handlers");
      return Response.json({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              summary: "One field-reported gap.",
              findings: [
                { severity: "medium", title: "SVG click targets", detail: "Use Element.closest.", source: "learning" },
                { severity: "low", title: "Triggers", detail: "Add when-to-use phrases." }
              ]
            })
          }
        ]
      });
    }) as typeof fetch;

    const result = await auditExistingAsset({
      config: config("anthropic"),
      secrets: { version: 1, anthropicApiKey: "sk-ant-test" },
      kind: "skills",
      name: "frontend-ui-engineering",
      content: "# Frontend",
      learnings: [
        {
          id: "e1",
          type: "correction",
          skill: "frontend-ui-engineering",
          summary: "Misses SVG targets in click handlers",
          capturedAt: "2026-09-01T10:00:00.000Z"
        }
      ]
    });

    expect(result.findings.map((finding) => finding.source)).toEqual(["learning", "best-practice"]);
  });

  it("omits field reports and finding sources when there are no learnings", async () => {
    globalThis.fetch = vi.fn(async (_url, init) => {
      const body = JSON.parse(String((init as RequestInit).body)) as {
        system?: string;
        messages?: Array<{ role: string; content: string }>;
      };
      const user = body.messages?.find((message) => message.role === "user")?.content ?? "";
      expect(body.system).not.toMatch(/Field reports:/);
      expect(user).not.toContain("Field reports");
      return Response.json({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              summary: "Gap.",
              findings: [{ severity: "low", title: "Triggers", detail: "Add triggers.", source: "learning" }]
            })
          }
        ]
      });
    }) as typeof fetch;

    const result = await auditExistingAsset({
      config: config("anthropic"),
      secrets: { version: 1, anthropicApiKey: "sk-ant-test" },
      kind: "skills",
      name: "review-pr",
      content: "# Review"
    });

    expect(result.findings[0]?.source).toBeUndefined();
  });

  it("marks field-report findings when improving", async () => {
    globalThis.fetch = vi.fn(async (_url, init) => {
      const body = JSON.parse(String((init as RequestInit).body)) as {
        messages?: Array<{ role: string; content: string }>;
      };
      const user = body.messages?.find((message) => message.role === "user")?.content ?? "";
      expect(user).toContain("1. [medium] (from a field report) SVG click targets");
      expect(user).toContain("2. [low] Triggers");
      return Response.json({ content: [{ type: "text", text: "# Frontend\n\nUse Element.closest." }] });
    }) as typeof fetch;

    await improveExistingAsset({
      config: config("anthropic"),
      secrets: { version: 1, anthropicApiKey: "sk-ant-test" },
      kind: "skills",
      name: "frontend-ui-engineering",
      content: "# Frontend",
      findings: [
        { severity: "medium", title: "SVG click targets", detail: "Use Element.closest.", source: "learning" },
        { severity: "low", title: "Triggers", detail: "Add when-to-use phrases.", source: "best-practice" }
      ]
    });

    expect(globalThis.fetch).toHaveBeenCalledOnce();
  });

  it("improves an existing asset from audit findings", async () => {
    globalThis.fetch = vi.fn(async (_url, init) => {
      const body = JSON.parse(String((init as RequestInit).body)) as {
        system?: string;
        messages?: Array<{ role: string; content: string }>;
      };
      const system = body.system ?? body.messages?.find((message) => message.role === "system")?.content ?? "";
      const user = body.messages?.find((message) => message.role === "user")?.content ?? "";
      expect(system).toMatch(/revise an existing/i);
      expect(user).toMatch(/Missing triggers/i);
      return Response.json({
        content: [
          {
            type: "text",
            text: "---\nname: review-pr\ndescription: Review PRs for security. Use when auditing pull requests.\n---\n\n# Review PR\n\n1. Check auth\n2. Report findings"
          }
        ]
      });
    }) as typeof fetch;

    const result = await improveExistingAsset({
      config: config("anthropic"),
      secrets: { version: 1, anthropicApiKey: "sk-ant-test" },
      kind: "skills",
      name: "review-pr",
      content: "# Review\n\nLook at the PR.",
      summary: "Needs clearer triggers.",
      findings: [
        {
          severity: "high",
          title: "Missing triggers",
          detail: "Add explicit when-to-use phrases."
        }
      ]
    });

    expect(result.content).toContain("name: review-pr");
    expect(result.content).toMatch(/when auditing/i);
  });
});

describe("truncation guards", () => {
  const anthropicSecrets: AiSecrets = { version: 1, anthropicApiKey: "sk-ant-test" };
  const finding = { severity: "medium" as const, title: "Tighten", detail: "Make steps concrete." };

  it("refuses to improve an asset longer than the model input limit", async () => {
    globalThis.fetch = vi.fn() as typeof fetch;

    await expect(
      improveExistingAsset({
        config: config("anthropic"),
        secrets: anthropicSecrets,
        kind: "skills",
        name: "long",
        content: "x".repeat(12_001),
        findings: [finding]
      })
    ).rejects.toMatchObject({ name: "AiProviderError", status: 400, message: expect.stringMatching(/12,001 characters/) });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("says when an audit only saw the start of the asset", async () => {
    globalThis.fetch = vi.fn(async () =>
      Response.json({ content: [{ type: "text", text: '{"summary":"Looks fine","findings":[]}' }], stop_reason: "end_turn" })
    ) as typeof fetch;

    const result = await auditExistingAsset({
      config: config("anthropic"),
      secrets: anthropicSecrets,
      kind: "rules",
      name: "long",
      content: "x".repeat(15_000)
    });

    expect(result.summary).toBe("Audited the first 12,000 of 15,000 characters. Looks fine");
  });

  it.each([
    ["anthropic", { content: [{ type: "text", text: "partial" }], stop_reason: "max_tokens" }],
    ["openai", { choices: [{ message: { content: "partial" }, finish_reason: "length" }] }],
    ["ollama", { message: { content: "partial" }, done_reason: "length" }]
  ] as const)("treats a %s response cut off at the token limit as an error", async (provider, body) => {
    globalThis.fetch = vi.fn(async () => Response.json(body)) as typeof fetch;

    await expect(
      improveExistingAsset({
        config: config(provider),
        secrets: { version: 1, anthropicApiKey: "sk-ant-test", openaiApiKey: "sk-test" },
        kind: "rules",
        name: "short",
        content: "# Rule",
        findings: [finding]
      })
    ).rejects.toMatchObject({ name: "AiProviderError", status: 502, message: expect.stringMatching(/cut off/) });
  });
});
