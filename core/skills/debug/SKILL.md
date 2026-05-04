---
name: debug
description: >-
  Systematic debugging workflow for isolating and fixing root causes. Use when
  hitting an error, test failure, or unexpected behavior, or when the user says
  "why isn't this working", "this is broken", or "help me debug". Follows a
  four-step approach: reproduce → isolate → fix root cause → guard with a
  regression test. Cross-editor, works in Cursor, Claude Code, Windsurf, and
  any other AI editor.
---

# Debug — Systematic Debugging

## Four-step workflow

### 1. Reproduce with a minimal case

Before touching code, confirm you can trigger the failure reliably.

- Write the smallest possible input or call that demonstrates the bug
- Record: actual output, expected output, and the environment (OS, runtime version, relevant config)
- If you cannot reproduce it, stop and gather more information — do not guess

### 2. Isolate (data? logic? environment?)

Narrow down where the fault lives:

- **Data** — is the input malformed or out of range?
- **Logic** — is the algorithm or control flow wrong?
- **Environment** — is it a config, dependency version, or platform issue?

Techniques:
- Add temporary logging or a debugger breakpoint at the entry point, then move it inward
- Comment out code blocks to find which section introduces the wrong behavior
- Check git blame / recent commits for changes near the failure site

### 3. Fix the root cause, not the symptom

- Avoid masking the error with a try-catch or a null check on the output
- If the root cause is in a dependency, document the workaround clearly and open a tracking issue

### 4. Guard with a regression test

- Write a test that fails without the fix and passes with it
- Place it alongside the affected code so it catches regressions automatically

---

## Example

**Scenario:** `calculateDiscount(price, pct)` returns `NaN` when `pct` is `"10"` (string).

**Step 1 — reproduce:**
```js
calculateDiscount(100, "10")  // → NaN  (expected: 90)
```

**Step 2 — isolate:**
Logging shows `price - price * pct` evaluates to `100 - "10"` → string concatenation path kicks in → `NaN`.

Root cause: `pct` is a string; the multiplication coerces incorrectly when subtraction follows.

**Step 3 — fix root cause:**
```js
function calculateDiscount(price, pct) {
  return price - price * Number(pct) / 100;
}
```

**Step 4 — regression test:**
```js
test("accepts string percentage without returning NaN", () => {
  expect(calculateDiscount(100, "10")).toBe(90);
});
```

---

## Checklist

- [ ] Reproduced the failure with a minimal case
- [ ] Identified whether it is data, logic, or environment
- [ ] Fixed the root cause (not just masked the output)
- [ ] Added a regression test that fails without the fix
