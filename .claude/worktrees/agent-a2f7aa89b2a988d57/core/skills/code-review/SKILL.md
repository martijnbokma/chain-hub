---
name: code-review
description: >-
  Five-dimension code review covering correctness, readability, security,
  performance, and tests. Use when reviewing pull requests, code changes, or
  when the user asks for a code review, says "review this", "check my code",
  or "bekijk mijn code". Produces structured feedback with severity labels so
  reviewers and authors can prioritize fixes. Cross-editor, works in Cursor,
  Claude Code, Windsurf, and any other AI editor.
---

# Code Review — Five Dimensions

## Severity labels

| Label | Meaning |
|-------|---------|
| 🔴 **Critical** | Must fix before merge — breaks behavior, security hole, or data loss risk |
| 🟡 **Suggestion** | Consider improving — code smell, readability issue, or better approach exists |
| 🟢 **Nice to have** | Optional enhancement — style preference or minor polish |

---

## The five dimensions

### 1. Correctness

- Logic errors and off-by-one mistakes
- Edge cases: empty input, zero, `null`/`undefined`, max values
- Error handling: are errors surfaced to the caller or swallowed?
- Concurrency: shared state, race conditions, missing locks
- Data mutations: does the function modify what it claims not to?

### 2. Readability

- Naming: do variables, functions, and types say what they hold or do?
- Complexity: can a long function be split into smaller, named helpers?
- Comments: are they explaining *why*, not *what*? Are they still true?
- Dead code: remove unused imports, variables, and unreachable branches

### 3. Security

- Injection: SQL, shell, HTML — is user input properly escaped or parameterized?
- Authentication and authorization: are endpoints protected?
- Secrets: are tokens, keys, or passwords hardcoded or logged?
- Input validation: is external data validated at the system boundary?

### 4. Performance

- Algorithmic complexity: O(n²) loops over large data sets, unnecessary iterations
- Unnecessary work: repeated computation that could be cached or moved out of a loop
- Memory: large allocations inside hot paths, unbounded growth
- I/O: N+1 queries, missing batching, synchronous work on async paths

### 5. Tests

- Coverage: are the happy path, edge cases, and error paths all exercised?
- Test quality: do tests assert behavior, or just that code runs without throwing?
- Brittleness: do tests break on unrelated changes (over-mocked, snapshot-heavy)?
- Missing cases: identify at least one untested scenario worth adding

---

## Review comment format

```
🔴 Critical — `processPayment`: does not validate that `amount > 0`; a negative
amount passes and reverses the charge on the merchant's account.

Suggestion: add `if (amount <= 0) throw new Error("amount must be positive")` at
the top of the function, and cover it with a test.
```

---

## Example (condensed)

**Code under review:**
```python
def get_user(user_id):
    query = f"SELECT * FROM users WHERE id = {user_id}"
    return db.execute(query).fetchone()
```

**Review:**
```
🔴 Critical — SQL injection: `user_id` is interpolated directly into the query.
Use a parameterized query: `db.execute("SELECT * FROM users WHERE id = ?", (user_id,))`

🟡 Suggestion — `SELECT *` fetches all columns; select only what callers need
to reduce data transfer and make the contract explicit.
```

---

## Checklist

- [ ] Checked all five dimensions
- [ ] Every 🔴 item has a concrete fix suggestion
- [ ] Noted which 🟢 items can be deferred without blocking merge
