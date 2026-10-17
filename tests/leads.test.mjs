import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { CORPORATE_EMAIL_ERROR, LEADS_ENDPOINT, SUBMISSION_ERROR, submitLead, validateCorporateEmail } from "../dist/assets/leads.js";

test("personal providers, aliases, mixed case and provider subdomains fail fast", () => {
  for (const email of [
    "person@gmail.com", "person@GMAIL.COM", " person@yahoo.com ",
    "person@hotmail.com", "person@outlook.co.uk", "person@googlemail.com",
    "person@proton.me", "person@icloud.com", "person@yahoo.co.uk", "person@team.gmail.com"
  ]) assert.throws(() => validateCorporateEmail(email), { message: CORPORATE_EMAIL_ERROR }, email);
});

test("corporate domains, nested corporate domains and provider-like business names pass", () => {
  for (const email of ["security@acme.example", "a+b@ops.enterprise.example", "Jane.Doe@GMAIL.acme.example", "audit@notgmail.com"]) {
    assert.equal(validateCorporateEmail(email), email.replace(/@.+$/, (domain) => domain.toLowerCase()));
  }
  assert.equal(validateCorporateEmail("  Jane.Doe@ACME.EXAMPLE  "), "Jane.Doe@acme.example");
});

test("malformed and overlong addresses are rejected", () => {
  for (const email of ["", "person", "a@@acme.example", "a b@acme.example", "a..b@acme.example", ".a@acme.example", "a@-acme.example", "a@acme", "a@acme.example.", "a".repeat(65) + "@acme.example"]) {
    assert.throws(() => validateCorporateEmail(email), { message: "Enter a valid corporate email address." }, email);
  }
});

test("API sends exactly the typed JSON payload to the supplied endpoint", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (...args) => { calls.push(args); return new Response(null, { status: 204 }); });
  const payload = { email: "security@acme.example", companySize: "500+" };
  await submitLead(payload);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], LEADS_ENDPOINT);
  assert.equal(calls[0][1].method, "POST");
  assert.equal(calls[0][1].headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(calls[0][1].body), payload);
});

test("HTTP and network failures reject without retries", async (t) => {
  const payload = { email: "audit@acme.example", companySize: "51-200" };
  let calls = 0;
  const mock = t.mock.method(globalThis, "fetch", async () => { calls++; return new Response(null, { status: 503 }); });
  await assert.rejects(submitLead(payload), { message: SUBMISSION_ERROR });
  assert.equal(calls, 1);
  mock.mock.mockImplementation(async () => { calls++; throw new TypeError("Failed to fetch"); });
  await assert.rejects(submitLead(payload), { message: "Failed to fetch" });
  assert.equal(calls, 2);
});

test("supplied copy, exact raw logo, labels and accessible feedback are present", async () => {
  const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
  for (const text of [
    "Your Infrastructure is Already Compromised. Stop Guessing. Start Auditing.",
    "Automated, zero-BS threat assessment for enterprise networks. We don't sugar-coat your vulnerabilities. Enter your corporate details to get the unvarnished truth about your attack surface.",
    "Generate Threat Report", "Assessment running. Check your inbox.",
    '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#00ff00" stroke-width="2" stroke-linecap="square"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>',
    'label for="email"', 'label for="company-size"', 'role="alert"', 'role="status"'
  ]) assert.ok(html.includes(text), text);
});
