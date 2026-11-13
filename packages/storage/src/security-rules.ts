import path from "node:path";

import type { SecurityScanSeverity } from "@chain-hub/contracts";

import type { SecurityScanFile } from "./security-scan.js";

export type FileKind = "markdown" | "code" | "text";

export const CODE_EXTENSIONS = new Set([
  ".sh", ".bash", ".zsh", ".fish", ".py", ".js", ".mjs", ".cjs", ".ts", ".mts", ".cts",
  ".jsx", ".tsx", ".rb", ".pl", ".pm", ".ps1", ".psm1", ".bat", ".cmd", ".php", ".go",
  ".rs", ".swift", ".lua", ".java", ".kt", ".cs", ".vb", ".vbs", ".applescript"
]);

export const MARKDOWN_EXTENSIONS = new Set([".md", ".mdx", ".markdown", ".mdc", ".txt", ".rst"]);

/** Executable/container formats that do not belong inside a skill folder. */
export const EXECUTABLE_EXTENSIONS = new Set([
  ".exe", ".dll", ".so", ".dylib", ".bin", ".msi", ".com", ".scr", ".class", ".jar",
  ".app", ".deb", ".rpm", ".pkg", ".apk", ".batx"
]);

/** Names that look like shipped credentials rather than documentation. */
export const SENSITIVE_FILENAME_RE =
  /(^|\/)(\.env(\.|$)|id_rsa|id_ed25519|id_ecdsa|id_dsa|credentials|secrets?\.json|\.netrc|_netrc|\.npmrc|\.pypirc|\.pgpass|.*\.pem$|.*\.key$|\.kube[/-]?config|htpasswd)/i;

export const NETWORK_RE =
  /\b(?:curl|wget|fetch\s*\(|requests\.(?:get|post|put)|urllib|axios|http\.request|Invoke-WebRequest|\biwr\b|nc\s|ncat\s|socat|scp\s|sftp|lftp|git\s+(?:clone|ls-remote)|nslookup|dig\s|ssh\s)/i;

// `Login Data`/`Local State` need path or quote context — as plain words they
// match ordinary English ("the login data", "drop the local state").
export const SENSITIVE_RE =
  /\.ssh[/\\]|id_rsa|id_ed25519|id_ecdsa|\.aws[/\\]|\.config[/\\]gcloud|\.gnupg|keychain|find-(?:generic|internet)-password|(?<!process)\.env\b|secrets?\.json|cookies?\.sqlite|(?<=[/\\"'])Login Data|(?<=[/\\"'])Local State|wallet\.dat|\.npmrc|\.netrc|_netrc|\.docker[/\\]config\.json|kube[/\\-]?config|credentials?\.(?:json|csv|txt|ya?ml|db|store|xml)\b|private[_-]?key|\.pem\b/i;

/**
 * Instruction-shaped rules cap at medium inside prose: documentation describes
 * dangerous commands as often as it issues them, and the two are statically
 * indistinguishable — those findings warrant review, not a block. SKILL.md is
 * exempt: it is the file an agent is guaranteed to execute, so its instructions
 * are held to full severity. Mechanical payload rules (exfil endpoints, env/secret
 * exfiltration, trojan source, the sensitive+network composite) stay high
 * everywhere — a real payload is a real payload in any file.
 */
const DOC_CAPPED_RULES = new Set([
  "remote-code-exec",
  "prompt-injection",
  "destructive",
  "persistence",
  "system-write"
]);

/** Comment lines describe intent rather than execute it — one severity notch off in code files. */
const COMMENT_LINE_RE = /^\s*(?:\/\/|\/\*|\*|\/?--|#|<!--)/;

export function severityFor(rule: ScanRule, file: SecurityScanFile, kind: FileKind, matchIndex: number): SecurityScanSeverity {
  let severity = rule.severity;
  const isSkillEntry = path.basename(file.path).toLowerCase() === "skill.md";
  if (severity === "high" && kind !== "code" && !isSkillEntry && DOC_CAPPED_RULES.has(rule.id)) {
    severity = "medium";
  }
  if (kind === "code" && severity !== "low") {
    const lineStart = file.content.lastIndexOf("\n", matchIndex - 1) + 1;
    const lineEnd = file.content.indexOf("\n", matchIndex);
    const line = file.content.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
    if (COMMENT_LINE_RE.test(line)) {
      severity = severity === "high" ? "medium" : "low";
    }
  }
  return severity;
}

export interface ScanRule {
  id: string;
  severity: SecurityScanSeverity;
  title: string;
  detail: string;
  /** Limit to file categories; omitted = every text file (a SKILL.md can carry the same payload). */
  kinds?: ReadonlyArray<FileKind>;
  patterns: RegExp[];
}

export const RULES: ScanRule[] = [
  {
    id: "remote-code-exec",
    severity: "high",
    title: "Downloads and executes remote code",
    detail: "Pipes remote content straight into a shell or interpreter, so whatever the URL serves is executed.",
    patterns: [
      /\b(?:curl|wget|Invoke-WebRequest|iwr)\b[^\n|]{0,400}\|\s*(?:sudo\s+)?(?:ba|z|fi|da)?sh\b/,
      /\b(?:curl|wget)\b[^\n|]{0,400}\|\s*(?:python[0-9.]*|python3?|node|ruby|perl|php)\b/,
      /\b(?:ba|z|fi)?sh\s+-c\s+["'`$(\s]*[^\n]{0,300}\b(?:curl|wget|Invoke-WebRequest)\b/,
      /\bbase64\b[^\n|]{0,80}(?:-d|--decode|-D\b)[^\n|]{0,200}\|\s*(?:ba|z|fi)?sh\b/,
      /\beval\s*[\s("'`]([^\n]{0,40})\$?\(?\s*[^\n]{0,300}\b(?:curl|wget|Invoke-WebRequest)\b/,
      /\b(?:Invoke-Expression|iex)\s*[\s(][^\n]{0,300}\b(?:Invoke-WebRequest|iwr|curl|wget|https?)\b/i,
      /\b(?:eval|exec|spawn|system)\s*\(\s*(?:atob|Buffer\.from|base64)/
    ]
  },
  {
    id: "exfil-endpoint",
    severity: "high",
    title: "References a known exfiltration endpoint",
    detail: "Mentions a data-collection service typically used to receive stolen data.",
    patterns: [
      /\b(?:webhook\.site|requestbin(?:\.com|\.net|\.org)|pipedream\.com|pastebin\.com\/raw|ngrok(?:-free)?\.(?:io|app|dev)|oast\.(?:fun|live|site|online|tools)|interactsh|transfer\.sh|burpcollaborator\.net|canarytokens\.com|beeceptor\.com|hookbin\.com|requestcatcher\.com|\.trycloudflare\.com)\b/i
    ]
  },
  {
    id: "secret-file-exfil",
    severity: "high",
    title: "Reads sensitive files and sends them over the network",
    detail: "Combines credential/secret access with an outbound transfer — classic data theft.",
    patterns: [
      /\b(?:curl|wget|nc|ncat|socat|scp|rsync|sftp)\b[^\n]{0,300}?(?:\.ssh|id_rsa|id_ed25519|\.aws|\.env\b|secrets?\.json|cookies?\.sqlite|Login Data|wallet\.dat|\.npmrc|\.netrc|keychain)/i,
      /\b(?:cat|base64|tar|zip|openssl\s+enc|gpg|xxd)\b[^\n|]{0,200}?(?:\.ssh|id_rsa|\.aws|\.env|cookie|wallet|secret|credential|keychain|Login Data|\.netrc|\.pem)[^\n]{0,120}?\|\s*(?:curl|wget|nc|ncat|socat|sh|bash)/i,
      /\b(?:env|printenv|export|set)\b[^\n|]{0,80}\|\s*(?:curl|wget|nc|ncat|socat|base64)/,
      /\b(?:curl|wget)\b[^\n]{0,200}?\s(?:-d\b|--data(?:-binary|-raw)?\b|-F\b|--form\b|-T\b|--upload-file\b)[^\n]{0,120}?@?[^\n]{0,80}?(?:\.env|\.ssh|id_rsa|cookie|credential|secret|token|keychain|wallet|\.pem|\.key\b)/i
    ]
  },
  {
    id: "env-exfil",
    severity: "high",
    title: "Dumps environment variables or secrets to an external destination",
    detail: "Environment dumps commonly carry API keys and tokens.",
    patterns: [
      /\b(?:env|printenv|set)\s*\|\s*(?:curl|wget|nc|ncat|socat|sh|bash)/,
      /(?:process\.env|os\.environ|\bENV\[)[^\n]{0,200}?\b(?:curl|wget|fetch\s*\(|requests\.(?:get|post|put|request)|urllib|axios|\.send\s*\(|\.post\s*\(|exfil)/,
      /\b(?:curl|wget)\b[^\n]{0,200}?\$\(\s*(?:env|printenv|cat\s+[^\n)]{0,60}(?:\.env|secret|token|key))/
    ]
  },
  {
    id: "trojan-source",
    severity: "high",
    title: "Uses bidirectional Unicode control characters",
    detail: "Bidi overrides can make displayed source differ from executed source (Trojan Source).",
    patterns: [
      /[\u202A-\u202E\u2066-\u2069]/
    ]
  },
  {
    id: "destructive",
    severity: "high",
    title: "Contains destructive filesystem or disk commands",
    detail: "Can wipe user data or damage the system if executed.",
    patterns: [
      /\brm\s+-[a-zA-Z]*[rf][a-zA-Z]*\s+(?:--no-preserve-root\s+)?(?:\/|~|\$HOME)\/?[^\s]*/,
      /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;/,
      /\bmkfs(?:\.\w+)?\s/,
      /\bdd\b[^\n]{0,200}\bof=\s*\/dev\//,
      /\bfind\s+\/[^\n]{0,120}?-delete\b/,
      /\bchmod\s+-R\s+(?:a\+|0?777|ugo\+)[rwx+]*\s+\/(?:\s|$)/,
      />\s*\/dev\/sd[a-z]/,
      /\b(?:diskutil|format)\s+(?:erase|secureErase|apfs\s+erase)\b/i
    ]
  },
  {
    id: "persistence",
    severity: "high",
    title: "Installs persistence mechanisms",
    detail: "Schedules or hooks execution outside the skill's own runtime (cron, launchd, shell rc, autostart).",
    patterns: [
      /\bcrontab\b|\/var\/spool\/cron|\/etc\/cron\.[a-z]/,
      /LaunchAgents|LaunchDaemons|\blaunchctl\s+(?:load|bootstrap|kickstart)/,
      /\bsystemctl\s+(?:--user\s+)?enable\b/,
      // `(?<!=)` keeps `=>` arrow functions (e.g. `...profile.map(`) from reading as a shell redirect.
      /(?:>>|(?<!=)>|\btee\b)\s*["']?[^\n"']*~?\/?\.(?:bashrc|zshrc|profile|bash_profile|zprofile|bash_aliases)\b/,
      /\\Software\\Microsoft\\Windows\\CurrentVersion\\Run/i,
      /\b(?:pre|post)install\b[^\n]{0,200}?\b(?:curl|wget|sh\b|bash|eval|node\s+-e)/i
    ]
  },
  {
    id: "prompt-injection",
    severity: "high",
    title: "Contains prompt-injection instructions",
    detail: "Instructs the consuming agent to bypass its rules, hide its actions, or leak secrets — content built to misuse agent access.",
    patterns: [
      /\bignore\s+(?:(?:all|any|the|every|previous|prior|above|earlier|following)[\s\w,-]{0,30})?\b(?:instructions?|rules?|guidelines?|safeguards|constraints)\b(?!\s+(?:found\s+)?(?:in|of|from|on|within|contained|inside|embedded|attached)\b)/i,
      /\bdisregard\s+(?:all|any|the|previous|prior|above)[\s\w,-]{0,30}\b(?:instructions?|guidelines?|rules?)\b/i,
      /\b(?:forget|override|bypass)\s+(?:all\s+|the\s+|your\s+)(?:previous\s+|prior\s+|existing\s+)?(?:instructions?|guidelines?|rules?|constraints|safeguards|safety)\b/i,
      /\b(?:you\s+are|act\s+as|enter)\s+(?:now\s+)?(?:in\s+)?(?:developer|admin|root|god|unrestricted|jailbreak|DAN)\s+mode\b/i,
      /\bdo\s+not\s+(?:tell|inform|reveal|mention|disclose|warn|alert|ask)[\s\w-]{0,30}\b(?:the\s+)?(?:user|human|operator)\b/i,
      /\b(?:silently|secretly|covertly|without\s+(?:telling|informing|asking|notifying))[\s\w-]{0,50}\b(?:send|post|upload|exfiltrate|transmit|run|execute|delete|modify|write)\b/i,
      /\bexfiltrat\w*\s+(?:(?:all|the|your|their|its|our|user'?s?|every)\s+){0,3}(?:data|files?|credentials?|secrets?|tokens?|keys?|passwords?|contents?|env(?:ironment)?|ssh|aws|private|source|code)/i,
      /\b(?:read|cat|print|dump|show|output|steal|collect|gather|harvest|grab|copy)\b[\s\w./~$-]{0,90}\b(?:id_rsa|\.ssh|\.aws|\.env\b|secrets?|credentials?|api[\s_-]?keys?|tokens?|passwords?|cookies?|wallet|keychain|private[\s_-]?key)\b[\s\w./~$-]{0,60}\b(?:send|post|upload|exfiltrate|transmit|curl|wget|fetch|https?|webhook|paste)\b/i,
      /\b(?:api[\s_-]?key|access[\s_-]?token|secret[\s_-]?key|password|credentials?)\b[\s\w.-]{0,50}\b(?:to|via|using|through)\s+(?:curl|wget|fetch|https?|webhook|email|message)/i
    ]
  },
  {
    id: "system-write",
    severity: "high",
    title: "Writes to system or hub-internal locations",
    detail: "Modifies system configuration, the hub's own system files, or uses sudo — far outside a skill's scope.",
    patterns: [
      /\bsudo\s+(?:tee|cp|mv|dd|install|sh|bash|chmod|chown|rm|launchctl|mkdir|systemctl|apt|yum|brew)\b/,
      /(?:>>|(?<!=)>|\bcp\b|\bmv\b|\bln\b|\brm\b)\s*["']?[^\n"']{0,100}\/(?:etc|usr|System|Library[/\\]Launch)/,
      /(?:>>|>|\btee\b|\bcp\b|\bmv\b|\brm\b|write|edit|overwrite)[^\n]{0,120}?~?\/?\.chain-hub[/\\]system/i,
      /\b(?:modify|edit|overwrite|replace|delete|write\s+to)\b[\s\w-]{0,30}~?\/?\.chain-hub[/\\]system/i
    ]
  },
  {
    id: "credential-access",
    severity: "medium",
    title: "Accesses credential or sensitive-data locations",
    detail: "References SSH keys, cloud credentials, browser data, wallets or .env files — review whether this is needed.",
    patterns: [
      /~?\/?\.ssh[/\\]|id_rsa|id_ed25519|id_ecdsa|id_dsa/,
      /~?\/?\.aws[/\\](?:credentials|config)|~?\/?\.config[/\\](?:gcloud|gh)|~?\/?\.gnupg|keychain|\bsecurity\s+find-(?:generic|internet)-password/,
      /\b(?:cat|less|more|head|tail|source|base64|xxd|openssl|gpg|print|dump|read|copy|cp)\b\s+["'`]?[^\n]{0,80}?(?:\.env\b|\.ssh|id_rsa|credentials?|secrets?|\.pem|\.key\b|cookies?|wallet|keychain|Login Data|\.netrc|\.npmrc|\.pypirc|\.pgpass)/i,
      /cookies?\.sqlite|(?<=[/\\"'])Login Data|(?<=[/\\"'])Local State|(?:Application Support|AppData)[/\\](?:Google[/\\]Chrome|Chromium|Firefox|Brave|Edge)/i,
      /wallet\.dat|\.bitcoin[/\\]|\.ethereum[/\\]|\bmetamask\b|\b(?:phantom|exodus)[\s_-]?(?:wallet|vault|extension|snap|keyring)\b/i,
      /~?\/?\.(?:docker[/\\]config\.json|kube[/\\]?config|netrc|_netrc|npmrc|pypirc|pgpass|git-credentials)\b/
    ]
  },
  {
    id: "config-tamper",
    severity: "medium",
    title: "Writes to editor, agent or user config directories",
    detail: "Modifies files under ~/.claude, ~/.cursor, ~/.agents, ~/.ssh, ~/.chain-hub or similar — verify the source trusts this.",
    patterns: [
      /(?:>>|(?<!=)>|\btee\b|\bcp\b|\bmv\b|\brm\b|write|edit|overwrite|append)[^\n]{0,140}?~\/?\.(?:ssh|aws|gnupg|agents|claude|cursor|codeium|devin|windsurf|zed|config|chain-hub)[/\\]/i,
      /\b(?:modify|edit|overwrite|append\s+to|delete|write\s+to)\b[\s\w-]{0,40}~\/?\.(?:ssh|aws|agents|claude|cursor|codeium|devin|windsurf|zed|chain-hub)\b/i
    ]
  },
  {
    id: "hidden-instruction",
    severity: "medium",
    title: "Hides instructions in comments or markup",
    detail: "Instructions inside comments are invisible when rendered but still reach the agent.",
    patterns: [
      // Keywords stay covert/credential-shaped: generic words like `run`,
      // `token` or `delete` fire on ordinary template comments.
      /<!--[^>]{0,400}?\b(?:ignore|disregard|override|exfiltrate|steal|password|api[\s_-]?key|credentials?|secrets?|sudo|curl|wget|fetch\s*\(|\.env\b|\.ssh|private[\s_-]?key|(?:api|access|auth|bearer|session|csrf)[\s_-]?tokens?)\b[^>]*?-->/i,
      /\/\*[^*]{0,400}?\b(?:exfiltrate|steal|api[\s_-]?key|password)[^*]{0,200}?\*\//i
    ]
  },
  {
    id: "obfuscation",
    severity: "medium",
    title: "Contains obfuscated content",
    detail: "Long encoded blobs or invisible characters can hide payloads a reviewer cannot read.",
    patterns: [
      /(?:^|[\s"'`(=,])[A-Za-z0-9+/]{160,}={0,2}(?=[\s"')`,;\]]|$)/m,
      /(?:\\x[0-9a-fA-F]{2}){8,}/,
      /[\u200B-\u200F\u2060\uFEFF]/
    ]
  },
  {
    id: "exec-primitive",
    severity: "medium",
    title: "Executes commands or evaluates dynamic code",
    detail: "Spawns processes or evaluates strings — legitimate in some scripts, risky in shipped content.",
    kinds: ["code", "text"],
    patterns: [
      /\bchild_process\b|\bexecFile(?:Sync)?\s*\(|\bspawn(?:Sync)?\s*\(|\bexec(?:Sync)?\s*\(\s*['"`]/,
      /\bsubprocess\.(?:call|run|Popen|check_output|getoutput)|\bos\.system\s*\(|\bos\.popen\s*\(|\bcommands\.getoutput/,
      /\bRuntime\.getRuntime\(\)\.exec|ProcessBuilder/,
      /\beval\s*\(|\bnew\s+Function\s*\(|\bStart-Process\b|\bInvoke-(?:Command|Item)\b/
    ]
  },
  {
    id: "clipboard-capture",
    severity: "medium",
    title: "Reads the clipboard or screen",
    detail: "Clipboard often holds secrets; screen capture can expose private data.",
    patterns: [
      /\bpbpaste\b|\bxclip\b|\bxsel\b|Get-Clipboard|screencapture|import\s+pyautogui|CGWindowListCreateImage/i
    ]
  },
  {
    id: "network-outbound",
    severity: "low",
    title: "Performs outbound network activity",
    detail: "Makes network calls — check they go where you expect.",
    kinds: ["code", "text"],
    patterns: [NETWORK_RE]
  },
  {
    id: "insecure-http",
    severity: "low",
    title: "Uses plain HTTP",
    detail: "Unencrypted endpoints can be intercepted or rewritten.",
    patterns: [
      // `http://www.w3.org/...` is an XML/SVG namespace identifier, not a fetched endpoint.
      /\bhttp:\/\/(?!(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?:[/:]|$)|www\.w3\.org(?:[/\s"')]|$))[^\s"')\]]+/
    ]
  }
];

/**
 * Instruction-language rules also match prose that *describes* an attack: docs
 * teaching an agent to resist injection quote the payload verbatim (`e.g.
 * "ignore previous instructions"`) or forbid the covert action ("don't
 * silently delete"). Both read as attacks to a plain pattern. Only the
 * prompt-injection rule is built from instruction language, so suppression is
 * scoped to it — mechanical payload rules never get suppressed.
 */
export const SUPPRESSIBLE_RULES = new Set(["prompt-injection"]);

export const QUOTE_BEFORE_RE = /["'`“”‘’«»]\s*$/;
export const EXAMPLE_OR_DEFENSE_RE =
  /\b(?:e\.g\.?|for\s+example|for\s+instance|such\s+as|examples?|phrases?|directives?|markers?|untrusted|malicious|suspicious|injection|manipulat|like|including|contains?|looks?\s+like)\b/i;
export const NEGATION_RE =
  /\b(?:don't|do\s+not|does\s+not|did\s+not|never|must\s+not|mustn't|should\s+not|shouldn't|shall\s+not|won't|will\s+not|cannot|can't|can\s+not|avoid(?:ing|ed)?|refrain(?:ing)?|not\s+allowed|forbidden|prohibited)\b/i;
// Abbreviation dots (e.g., i.e.) are not sentence boundaries for clause detection.
export const ABBREVIATION_DOT_RE = /\b(?:e\.g|i\.e|etc|vs|approx|ca)\./gi;
