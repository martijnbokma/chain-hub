import { afterEach, describe, expect, it, vi } from "vitest";

import { aiConfigSchema, type AiSecrets } from "@chain-hub/contracts";

import { AiProviderError, generateAssetDraft } from "./ai-providers.js";

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
    expect(result.suggestedName).toBeUndefined();
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
              text: '```json\n{"kind":"workflows","reason":"Ordered release steps fit a workflow."}\n```'
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
    expect(result.content).toContain("Release checklist");
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });
});
