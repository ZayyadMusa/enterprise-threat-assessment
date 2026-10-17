import assert from "node:assert/strict";
import { test } from "node:test";
import { setImmediate } from "node:timers/promises";
import { CORPORATE_EMAIL_ERROR, SUBMISSION_ERROR } from "../dist/assets/leads.js";

// A small DOM boundary double exercises real event wiring and state transitions.
// It does not replace rendered browser/layout verification.
class Element extends EventTarget {
  value = "";
  hidden = false;
  disabled = false;
  textContent = "";
  attributes = new Map();
  setAttribute(key, value) { this.attributes.set(key, value); }
  focus() { globalThis.document.activeElement = this; }
}

let fixtureId = 0;
async function fixture(t, fetchImplementation) {
  const elements = Object.fromEntries(["lead-form", "email", "company-size", "submit-lead", "form-error", "success"].map((id) => [id, new Element()]));
  elements.success.hidden = true;
  elements["form-error"].hidden = true;
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", {
    value: { activeElement: null, querySelector: (selector) => elements[selector.slice(1)] },
    configurable: true
  });
  t.after(() => {
    if (previousDocument) Object.defineProperty(globalThis, "document", previousDocument);
    else delete globalThis.document;
  });
  const requests = [];
  t.mock.method(globalThis, "fetch", (...args) => { requests.push(args); return fetchImplementation(...args); });
  await import("../dist/assets/main.js?fixture=" + fixtureId++);
  return { elements, requests, submit: () => elements["lead-form"].dispatchEvent(new Event("submit", { cancelable: true })) };
}

test("free email errors are visible and no request escapes the form", async (t) => {
  const { elements: e, requests, submit } = await fixture(t, async () => new Response());
  e.email.value = "buyer@GMAIL.COM";
  e["company-size"].value = "500+";
  submit();
  assert.equal(e["form-error"].textContent, CORPORATE_EMAIL_ERROR);
  assert.equal(e["form-error"].hidden, false);
  assert.equal(e.email.attributes.get("aria-invalid"), "true");
  assert.equal(globalThis.document.activeElement, e.email);
  assert.equal(e.success.hidden, true);
  assert.equal(requests.length, 0);
});

test("blur validates without stealing focus; editing clears the error", async (t) => {
  const { elements: e, requests } = await fixture(t, async () => new Response());
  e.email.value = "buyer@yahoo.com";
  e.email.dispatchEvent(new Event("blur"));
  assert.equal(e["form-error"].textContent, CORPORATE_EMAIL_ERROR);
  assert.equal(globalThis.document.activeElement, null);
  e.email.value = "buyer@acme.example";
  e.email.dispatchEvent(new Event("input"));
  assert.equal(e["form-error"].hidden, true);
  assert.equal(e.email.attributes.get("aria-invalid"), "false");
  assert.equal(requests.length, 0);
});

test("empty or tampered company size is rejected before posting", async (t) => {
  const { elements: e, requests, submit } = await fixture(t, async () => new Response());
  e.email.value = "buyer@acme.example";
  for (const value of ["", "999999", "<script>"]) {
    e["company-size"].value = value;
    submit();
    assert.equal(e["form-error"].textContent, "Select your company size.");
    assert.equal(globalThis.document.activeElement, e["company-size"]);
  }
  assert.equal(requests.length, 0);
});

test("one in-flight request; form swaps only after acceptance and does not submit again", async (t) => {
  let accept;
  const pending = new Promise((resolve) => { accept = resolve; });
  const { elements: e, requests, submit } = await fixture(t, () => pending);
  e.email.value = "buyer@acme.example";
  e["company-size"].value = "201-500";
  submit();
  submit();
  assert.equal(requests.length, 1);
  assert.equal(e["submit-lead"].disabled, true);
  assert.equal(e["lead-form"].attributes.get("aria-busy"), "true");
  assert.equal(e.success.hidden, true);
  assert.equal(e["lead-form"].hidden, false);
  accept(new Response(null, { status: 202 }));
  await setImmediate();
  assert.equal(e["lead-form"].hidden, true);
  assert.equal(e.success.hidden, false);
  assert.equal(globalThis.document.activeElement, e.success);
  submit();
  assert.equal(requests.length, 1);
});

test("all four company sizes reach the payload unchanged", async (t) => {
  for (const size of ["1-50", "51-200", "201-500", "500+"]) {
    const { elements: e, requests, submit } = await fixture(t, async () => new Response(null, { status: 204 }));
    e.email.value = "Buyer@ACME.EXAMPLE";
    e["company-size"].value = size;
    submit();
    await setImmediate();
    assert.deepEqual(JSON.parse(requests[0][1].body), { email: "Buyer@acme.example", companySize: size });
    assert.equal(e.success.hidden, false);
  }
});

test("HTTP failure stays visibly failed with no false success or retry path", async (t) => {
  const { elements: e, requests, submit } = await fixture(t, async () => new Response(null, { status: 500 }));
  e.email.value = "buyer@acme.example";
  e["company-size"].value = "500+";
  submit();
  await setImmediate();
  assert.equal(e.success.hidden, true);
  assert.equal(e["lead-form"].hidden, false);
  assert.equal(e["form-error"].textContent, SUBMISSION_ERROR);
  assert.equal(e["form-error"].hidden, false);
  assert.equal(e["submit-lead"].disabled, true);
  submit();
  assert.equal(requests.length, 1);
});

test("network failure shows the same terminal error and never confirms receipt", async (t) => {
  const { elements: e, requests, submit } = await fixture(t, async () => { throw new TypeError("Network offline"); });
  e.email.value = "buyer@acme.example";
  e["company-size"].value = "51-200";
  submit();
  await setImmediate();
  assert.equal(e.success.hidden, true);
  assert.equal(e["form-error"].textContent, SUBMISSION_ERROR);
  assert.equal(requests.length, 1);
});
