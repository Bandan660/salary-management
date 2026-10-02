/**
 * Only allow post-login redirects back into this app, never to another site
 * (prevents open redirects via /login?next=https://evil.example).
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/")) return "/";
  // "//host" and "/\host" are protocol-relative URLs to another origin.
  if (next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}
