# Contact / Enquiry Form — Test Case Checklist

> Source: `QA Checklist - Contact form.xlsx` (internal QA template).
> **Apply only when the crawled page contains a matching form — do NOT generate these cases for pages without the pattern.**

---

## Applicability (detection)

Apply this checklist to a page only if its `pageAnalysis.forms[]` contains a form that matches **any** of:

- Field names / placeholders / labels contain: `name`, `first name`, `last name`, `email`, `phone`, `mobile`, `message`, `comment`, `enquiry`, `inquiry`, `query`, `subject`.
- Submit action / URL contains: `/contact`, `/enquiry`, `/inquiry`, `/get-in-touch`, `/reach-us`, `/talk-to-us`, `/request`, `/demo`.
- Page title / heading contains: "Contact", "Get in Touch", "Enquire", "Reach us", "Talk to us", "Request a demo".

If multiple contact forms exist (e.g. a main form + a footer form), generate the checklist **per form**, tagged to that form's specific page.

---

## 1. Mandatory Fields

- Verify all mandatory fields must be filled before the form can be submitted.
- Verify a missing mandatory field shows the validation message **"{Field Name} is required"** near the relevant input.
- Verify every mandatory field is marked with a red asterisk (`*`) in its label.
- Verify that clicking Submit on an empty form triggers validation on every mandatory field (not just the first one).

## 2. First Name / Last Name

- Verify leading whitespace in the First Name / Last Name field is rejected or trimmed.
- Verify only alphabetic characters are accepted — numerics, symbols and emoji are rejected with a message.
- Verify First Name minimum length is **2 characters**.
- Verify Last Name has **no minimum length** (single-character family names must be allowed).
- Verify Maximum length of both First Name and Last Name is **56 characters**.
- Verify trailing / consecutive whitespace is normalised.

## 3. Email Address

- Verify email format matches `user@example.com` pattern.
- Verify an invalid entry shows **"Invalid email address"**.
- Verify leading and trailing whitespace inside the email field is blocked.
- Verify all common providers are accepted — `gmail.com`, `yahoo.com`, `outlook.com`, `hotmail.com`, custom corporate domains.
- Verify a placeholder or example email is shown in the empty input.
- Verify disallowed special characters produce a specific reason, not a generic error.
- Verify case-insensitive uniqueness / matching where applicable.

## 4. Phone Number

- Verify correct phone format is accepted.
- Verify multiple input formats are handled — with and without dashes, with and without country code.
- Verify min / max length rules are enforced.
- Verify leading, trailing, and consecutive whitespace are handled correctly.
- Verify special characters are either normalised or rejected with a specific message.
- Verify the form cannot be submitted without a phone number if the field is required.

## 5. Dropdowns / Select Boxes

- Verify a default option is present where applicable.
- Verify the dropdown contains the expected number of options.
- Verify options are sorted alphabetically or in the documented logical order.
- Verify disabled options cannot be selected and are visually distinct from enabled ones.
- Verify the selected option is submitted correctly with the form payload.

## 6. Checkboxes / Radio Buttons

- Verify at least one option is required where the group is mandatory.
- Verify the default state (checked / unchecked) matches the spec.
- Verify the control toggles by clicking either the control or its label.
- Verify multi-select works where allowed.
- Verify disabled options cannot be selected and look visually distinct.
- Verify default selections are present in the submitted payload.

## 7. URLs (if URL field present)

- Verify URL format validation accepts `http://` and `https://` prefixes.
- Verify malformed URLs are rejected with a specific message.
- Verify any outbound link in the response page (confirmation / thank-you) returns `200` (no broken links).

## 8. File Upload (if a file field is present)

- Verify only allowed file types are accepted (e.g. `.jpg`, `.png`, `.pdf`).
- Verify the file-size limit is enforced with the message **"File size exceeds the maximum limit of 2MB."** (substitute the configured limit).
- Verify disallowed file types produce **"Invalid file type. Please upload a .jpg, .png, or .pdf file."**.
- Verify multi-upload works where supported and each file is handled independently.
- Verify special characters and spaces in file names are preserved or sanitised cleanly.
- Verify a file-preview feature works if present.
- Verify a progress indicator shows accurate upload status if present.
- Verify default / pre-attached files are processed correctly on submit.

## 9. Message / Comment Field

- Verify the maximum length is **1500 characters**.
- Verify a live character counter is shown and updates on every keystroke.
- Verify a scrollbar appears when content exceeds the visible area.
- Verify the field label clearly marks the field as optional if it is not required.
- Verify code-like operators, HTML tags, and `<script>` payloads are stripped, escaped, or safely stored (XSS protection).

## 10. Submit Button

- Verify double / rapid clicks cannot cause duplicate submissions — the button disables or shows a loader immediately on click.
- Verify the success message **"Form submitted successfully!"** appears after a valid submission.
- Verify every field resets to its default state after a successful submission.
- Verify a generic failure shows **"An error occurred while submitting the form. Please try again."**.
- Verify offline submission attempts show **"Network error. Please check your internet connection and try again."**.
- Verify a service-down state shows **"The system is currently under maintenance. Please try again later."**.

## 11. CAPTCHA / Bot Protection

- Verify CAPTCHA (or equivalent bot-protection — reCAPTCHA, hCaptcha, honeypot) is present on the form.
- Verify submissions without a valid CAPTCHA response are rejected at the server, not just at the client.

## 12. Consent / Terms

- Verify a "Terms and Conditions" / privacy-policy checkbox is present if the form collects PII.
- Verify the form cannot submit until consent is given.
- Verify the T&C and Privacy Policy links open valid pages (not 404).

## 13. Error Message Behaviour

- Verify all validation messages are clear, specific, and positioned near the relevant field (not at the top of the form unless grouped intentionally).
- Verify validation triggers on blur / tab-out — not only on final submit.
- Verify once a field is corrected its error message clears.

## 14. Page-Level / SEO Checks for the Contact Page

- Verify the page has an OG image set for social sharing.
- Verify UTM parameters on the incoming URL are preserved through form submission (analytics attribution).
- Verify the site footer shows the correct phone and email that match the form's destination mailbox.
- Verify Privacy Policy and Terms & Conditions links in the footer / form area resolve correctly.

---

## Standard Messages Reference

| Scenario | Expected Message |
|---|---|
| Missing mandatory field | `{Field Name} is required` |
| Invalid email | `Invalid email address` |
| File too large | `File size exceeds the maximum limit of 2MB.` |
| Wrong file type | `Invalid file type. Please upload a .jpg, .png, or .pdf file.` |
| Submission success | `Form submitted successfully!` |
| Generic submission error | `An error occurred while submitting the form. Please try again.` |
| Network failure | `Network error. Please check your internet connection and try again.` |
| Maintenance mode | `The system is currently under maintenance. Please try again later.` |

---

## How to apply

- For every contact / enquiry form detected on the crawled pages, each numbered section above becomes one or more test cases, tagged to that form's **specific page URL** (per the Hard Output Rules of the UltraThink skill).
- Skip sections that don't apply to the detected form (e.g. skip §8 File Upload if no file input exists).
- Where the form uses different limits (e.g. message max ≠ 1500, file max ≠ 2MB), use the **actual discovered limits** from `pageAnalysis` and state them in the test case — do not hardcode the values from this template.
- Priority: Mandatory field (§1), Email (§3), Submit button duplicate-click (§10), CAPTCHA (§11), and XSS in Message (§9) are all **P0**. Others are P1 unless clearly cosmetic.
