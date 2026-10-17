export const COMPANY_SIZES = ["1-50", "51-200", "201-500", "500+"] as const;
export type CompanySize = (typeof COMPANY_SIZES)[number];

export interface LeadPayload {
  readonly email: string;
  readonly companySize: CompanySize;
}

export const LEADS_ENDPOINT = "https://api.mock-cyber-consultancy.com/v1/leads";
export const CORPORATE_EMAIL_ERROR = "Corporate emails only. We don't audit personal inboxes.";
export const SUBMISSION_ERROR = "Submission failed. Your details were not confirmed received.";

// Include common aliases and regional domains, not just the three examples.
const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "yahoo.co.in",
  "yahoo.fr", "yahoo.de", "yahoo.ca", "yahoo.com.au", "yahoo.co.jp", "ymail.com", "rocketmail.com",
  "hotmail.com", "hotmail.co.uk", "hotmail.fr", "hotmail.de", "hotmail.it",
  "hotmail.es", "outlook.com", "outlook.co.uk", "outlook.fr", "outlook.de",
  "live.com", "live.co.uk", "live.fr", "live.de", "msn.com",
  "aol.com", "aim.com", "icloud.com", "me.com", "mac.com",
  "proton.me", "protonmail.com", "protonmail.ch", "pm.me",
  "gmx.com", "gmx.net", "gmx.de", "mail.com", "email.com", "web.de",
  "yandex.com", "yandex.ru", "ya.ru", "tuta.com", "tutanota.com", "tutanota.de",
  "fastmail.com", "hey.com", "zoho.com", "zohomail.com",
  "qq.com", "foxmail.com", "163.com", "126.com", "mail.ru", "inbox.ru", "bk.ru", "list.ru"
]);

const EMAIL_PATTERN = /^[a-z0-9!#$%&'*+/=?^_{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

/** Validate once and return the address with its domain normalized. */
export function validateCorporateEmail(input: string): string {
  const email = input.trim();
  const separator = email.lastIndexOf("@");
  const local = email.slice(0, separator);
  const domain = email.slice(separator + 1).toLowerCase();

  if (!EMAIL_PATTERN.test(email) || email.length > 254 || local.length > 64) {
    throw new Error("Enter a valid corporate email address.");
  }

  // Checking domain suffixes also rejects subdomain bypasses, e.g. user@team.gmail.com.
  const labels = domain.split(".");
  if (labels.some((_, index) => FREE_EMAIL_DOMAINS.has(labels.slice(index).join(".")))) {
    throw new Error(CORPORATE_EMAIL_ERROR);
  }

  return local + "@" + domain;
}

/** One POST, no retries, alternate endpoints, or simulated success. */
export async function submitLead(payload: LeadPayload): Promise<void> {
  const response = await fetch(LEADS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    credentials: "omit",
    referrerPolicy: "no-referrer",
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error(SUBMISSION_ERROR);
}
