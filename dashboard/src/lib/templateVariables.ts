export const VARIABLE_PATTERN = /{{\s*([\w.]+)\s*}}/g;

// Shared between TemplatePicker (Compose page) and TemplatesPage (Day
// 102) so both detect `{{variable}}` placeholders the same way -- the
// server doesn't validate that `variables` matches what's actually in
// `body` (see docs/templates.md), so client-side auto-detection is the
// only thing keeping the two in sync.
export function detectVariables(body: string): string[] {
  const names = new Set<string>();
  for (const match of body.matchAll(VARIABLE_PATTERN)) {
    names.add(match[1]);
  }
  return [...names];
}
