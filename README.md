# Enterprise Threat Assessment

**Live website:** [Open Enterprise Threat Assessment](https://enterprise-threat-assessment.vercel.app/)

A responsive corporate lead form with company-email validation, company-size selection and explicit loading, success and failure states. Built with TypeScript, HTML and CSS.

## Development

Run `npm ci`, `npm run check`, `npm run build`, and `npm test`. Serve `dist/` on a static HTTPS host, or import the repository into Vercel.

## Lead delivery

Set `LEADS_ENDPOINT` in `src/leads.ts` to the real HTTPS lead endpoint and rebuild before launch. The included endpoint is a mock configuration. It must accept the documented JSON payload and allow the site's origin. No lead storage, report generation or email delivery is bundled.

Client validation improves form feedback. The receiving server must independently validate the email and company size. A successful response is shown only after an accepted HTTP response; network and HTTP failures remain visible without automatic retries.
