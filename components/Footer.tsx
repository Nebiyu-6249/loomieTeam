import React from "react";
import { FooterView } from "./FooterView";
import { getSettings, getSocialLinks } from "@/lib/content";

/**
 * The footer, with the theatre removed.
 *
 * It used to carry a 540px banner of the purple CGI gradient, a badge naming a
 * nonexistent engine, an establishment date and a headline promising something
 * extraordinary. None of it was information. What a footer owes the visitor is
 * a way to get in touch, a way to get to the other pages, and the studio's name.
 *
 * This half exists so pages do not have to pass the address and the social
 * links down: it reads them here, and FooterView renders them.
 */
export async function Footer() {
  const [settings, socials] = await Promise.all([getSettings(), getSocialLinks()]);

  return (
    <FooterView
      contactEmail={settings.contact_email}
      socials={socials}
      statement={settings.footer_statement}
    />
  );
}
