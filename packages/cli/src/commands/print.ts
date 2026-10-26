/** Commands print their result as pretty JSON so scripts can pipe it. */
export function printJson(value: unknown, write: (text: string) => void = console.log): void {
  write(JSON.stringify(value, null, 2));
}
