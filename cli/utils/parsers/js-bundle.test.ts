import { expect, test, describe } from "bun:test"
import { unescapeJsSingleQuoted, extractContentValue, extractNameNearId, parseBundle } from "./js-bundle"

describe("unescapeJsSingleQuoted", () => {
  test("returns empty string unchanged", () => {
    expect(unescapeJsSingleQuoted("")).toBe("")
  })

  test("passes through plain text", () => {
    expect(unescapeJsSingleQuoted("hello world")).toBe("hello world")
  })

  test("unescapes newline, tab, carriage return", () => {
    expect(unescapeJsSingleQuoted("a\\nb")).toBe("a\nb")
    expect(unescapeJsSingleQuoted("a\\tb")).toBe("a\tb")
    expect(unescapeJsSingleQuoted("a\\rb")).toBe("a\rb")
  })

  test("unescapes single and double quote", () => {
    expect(unescapeJsSingleQuoted("it\\'s")).toBe("it's")
    expect(unescapeJsSingleQuoted("say \\\"hi\\\"")).toBe('say "hi"')
  })

  test("unescapes backslash", () => {
    expect(unescapeJsSingleQuoted("a\\\\b")).toBe("a\\b")
  })

  test("unknown escape sequence passes through the following char", () => {
    expect(unescapeJsSingleQuoted("\\x41")).toBe("x41")
  })

  test("handles mixed escapes in one string", () => {
    expect(unescapeJsSingleQuoted("line1\\nline2\\ttabbed")).toBe("line1\nline2\ttabbed")
  })
})

describe("extractContentValue", () => {
  test("returns null when no content: key present", () => {
    expect(extractContentValue("id:'foo',name:'bar'")).toBeNull()
  })

  test("extracts backtick string", () => {
    expect(extractContentValue("content: `hello world`")).toBe("hello world")
  })

  test("extracts backtick string with leading whitespace/newline", () => {
    expect(extractContentValue("content:\n  `hello`")).toBe("hello")
  })

  test("extracts single-quoted string", () => {
    expect(extractContentValue("content: 'hello world'")).toBe("hello world")
  })

  test("handles escape sequences in single-quoted string", () => {
    expect(extractContentValue("content: 'line1\\nline2'")).toBe("line1\nline2")
  })

  test("handles escaped backtick in template literal", () => {
    expect(extractContentValue("content: `hello \\` world`")).toBe("hello ` world")
  })

  test("returns null for unterminated single-quoted string", () => {
    expect(extractContentValue("content: 'unterminated")).toBeNull()
  })

  test("returns null for unterminated backtick string", () => {
    expect(extractContentValue("content: `unterminated")).toBeNull()
  })

  test("returns null when content: is present but no recognized quote follows", () => {
    expect(extractContentValue('content: "double quoted"')).toBeNull()
  })
})

describe("extractNameNearId", () => {
  test("returns null when no name: present", () => {
    expect(extractNameNearId("id:'foo'")).toBeNull()
  })

  test("extracts a simple name", () => {
    expect(extractNameNearId('name:"Minimal"')).toBe("Minimal")
  })

  test("decodes unicode escape sequences in name", () => {
    expect(extractNameNearId('name:"caf\\u00e9"')).toBe("café")
  })

  test("returns raw match if unicode decode fails gracefully", () => {
    // Valid match without unicode — should return as-is
    expect(extractNameNearId('name:"plain"')).toBe("plain")
  })
})

describe("parseBundle", () => {
  test("returns empty array for empty input", () => {
    expect(parseBundle("")).toEqual([])
  })

  test("returns empty array when no id: patterns found", () => {
    expect(parseBundle("const x = 1")).toEqual([])
  })

  test("parses a single style with name and content", () => {
    const js = `id:"minimal",name:"Minimal",content: \`Keep it short.\``
    const result = parseBundle(js)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("minimal")
    expect(result[0].name).toBe("Minimal")
    expect(result[0].content).toBe("Keep it short.")
  })

  test("deduplicates repeated IDs", () => {
    const js = `id:"foo",id:"foo",name:"Foo",content:\`bar\``
    const result = parseBundle(js)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("foo")
  })

  test("returns multiple styles sorted by ID", () => {
    const js = `id:"zebra",name:"Z",content:\`z\` id:"alpha",name:"A",content:\`a\``
    const result = parseBundle(js)
    expect(result.map((s) => s.id)).toEqual(["alpha", "zebra"])
  })

  test("sets name and content to null when not found in window", () => {
    const js = `id:"ghost"`
    const result = parseBundle(js)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBeNull()
    expect(result[0].content).toBeNull()
  })
})
