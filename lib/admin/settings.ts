/**
 * The six settings, described once.
 *
 * Separate from the action that saves them because a `"use server"` file may
 * only export async functions — exporting this array from there fails the
 * build with a message about "found object" rather than about the rule.
 *
 * `site_settings` has a CHECK constraint listing exactly these keys, so a typo
 * here is a refused row rather than a field that silently does nothing.
 */
export interface Setting {
  key: string;
  label: string;
  help: string;
  kind: "text" | "textarea" | "email";
}

export const SETTINGS: Setting[] = [
  {
    key: "contact_email",
    label: "Contact address",
    help: "Shown on the contact page, in the footer and in the navigation. Also the address every error message tells a visitor to write to.",
    kind: "email",
  },
  {
    key: "booking_email",
    label: "Booking address",
    help: "Where booking notifications are addressed. Usually the same as the contact address.",
    kind: "email",
  },
  {
    key: "site_title",
    label: "Site title",
    help: "The browser tab and the search result heading.",
    kind: "text",
  },
  {
    key: "site_description",
    label: "Site description",
    help: "The sentence under the title in a search result. Around 150 characters reads best.",
    kind: "textarea",
  },
  {
    key: "availability_text",
    label: "Booking invitation",
    help: "The line above the booking panel on the contact page.",
    kind: "textarea",
  },
  {
    key: "footer_statement",
    label: "Footer line",
    help: "The short line beside the copyright.",
    kind: "text",
  },
];
