// `locale`/`timeZone` let tests pin a deterministic result; production call
// sites omit both so the viewer's own browser locale and timezone are used.
export function formatTimestamp(iso: string, options?: { locale?: string; timeZone?: string }): string {
  return new Intl.DateTimeFormat(options?.locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: options?.timeZone,
  }).format(new Date(iso));
}
