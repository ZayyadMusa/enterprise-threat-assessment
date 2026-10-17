import { COMPANY_SIZES, SUBMISSION_ERROR, submitLead, validateCorporateEmail } from "./leads.js";
import type { CompanySize, LeadPayload } from "./leads.js";
import { setUIState } from "./ui.js";
import type { FormElements } from "./ui.js";

const elements: FormElements = {
  form: document.querySelector<HTMLFormElement>("#lead-form")!,
  email: document.querySelector<HTMLInputElement>("#email")!,
  companySize: document.querySelector<HTMLSelectElement>("#company-size")!,
  button: document.querySelector<HTMLButtonElement>("#submit-lead")!,
  error: document.querySelector<HTMLParagraphElement>("#form-error")!,
  success: document.querySelector<HTMLElement>("#success")!
};

// A small runtime guard is still needed: DOM values are strings, not TypeScript unions.
const companySizes = new Set<string>(COMPANY_SIZES);
let submitting = false;

elements.email.addEventListener("blur", () => {
  if (!elements.email.value.trim() || submitting) return;
  try {
    validateCorporateEmail(elements.email.value);
  } catch (error) {
    setUIState(elements, {
      status: "invalid", field: "email", message: (error as Error).message, focus: false
    });
  }
});

elements.email.addEventListener("input", () => {
  if (!submitting) setUIState(elements, { status: "idle" });
});

elements.companySize.addEventListener("change", () => {
  if (!submitting) setUIState(elements, { status: "idle" });
});

elements.form.addEventListener("submit", async (event: SubmitEvent) => {
  event.preventDefault();
  if (submitting) return;

  let email: string;
  try {
    email = validateCorporateEmail(elements.email.value);
  } catch (error) {
    setUIState(elements, { status: "invalid", field: "email", message: (error as Error).message });
    return;
  }

  const companySize = elements.companySize.value;
  if (!companySizes.has(companySize)) {
    setUIState(elements, { status: "invalid", field: "companySize", message: "Select your company size." });
    return;
  }

  const payload: LeadPayload = { email, companySize: companySize as CompanySize };
  submitting = true;
  setUIState(elements, { status: "submitting" });

  try {
    await submitLead(payload);
    setUIState(elements, { status: "success" });
  } catch {
    setUIState(elements, { status: "failed", message: SUBMISSION_ERROR });
  }
});
