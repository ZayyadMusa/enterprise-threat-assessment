export type UIState =
  | { status: "idle" }
  | { status: "invalid"; field: "email" | "companySize"; message: string; focus?: boolean }
  | { status: "submitting" }
  | { status: "success" }
  | { status: "failed"; message: string };

export interface FormElements {
  form: HTMLFormElement;
  email: HTMLInputElement;
  companySize: HTMLSelectElement;
  button: HTMLButtonElement;
  error: HTMLParagraphElement;
  success: HTMLElement;
}

/** The sole owner of visible form, error, pending, and success states. */
export function setUIState(elements: FormElements, state: UIState): void {
  const success = state.status === "success";
  const busy = state.status === "submitting";
  const hasError = state.status === "invalid" || state.status === "failed";

  elements.form.hidden = success;
  elements.success.hidden = !success;
  elements.form.setAttribute("aria-busy", String(busy));
  elements.email.disabled = busy || state.status === "failed";
  elements.companySize.disabled = busy || state.status === "failed";
  elements.button.disabled = busy || success || state.status === "failed";
  elements.button.textContent = busy ? "Submitting…" : "Generate Threat Report";
  elements.error.textContent = hasError ? state.message : "";
  elements.error.hidden = !hasError;
  elements.email.setAttribute("aria-invalid", String(state.status === "invalid" && state.field === "email"));
  elements.companySize.setAttribute("aria-invalid", String(state.status === "invalid" && state.field === "companySize"));

  if (state.status === "invalid" && state.focus !== false) elements[state.field].focus();
  if (success) elements.success.focus();
}
