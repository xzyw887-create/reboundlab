/** Popular throwaway domains — blocks casual multi-trial signup. */
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "grr.la",
  "sharklasers.com",
  "10minutemail.com",
  "10minutemail.net",
  "tempmail.com",
  "temp-mail.org",
  "throwaway.email",
  "yopmail.com",
  "trashmail.com",
  "getnada.com",
  "maildrop.cc",
  "dispostable.com",
  "fakeinbox.com",
  "mintemail.com",
  "emailondeck.com",
  "tempail.com",
  "inboxkitten.com",
  "mailnesia.com",
  "mailcatch.com",
  "dropmail.me",
  "harakirimail.com",
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@").pop();
  if (!domain) return false;
  return DISPOSABLE_DOMAINS.has(domain);
}
