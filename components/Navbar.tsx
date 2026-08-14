import React from "react";
import { NavbarView } from "./NavbarView";
import { getContactEmail } from "@/lib/content";

/**
 * Reads what the navigation needs, so pages do not have to pass it.
 *
 * getContactEmail rather than getSettings: the navigation is on every page
 * including the ones that render when something is misconfigured, and a menu
 * that throws because it could not read a settings row would take the whole
 * page with it.
 */
export async function Navbar() {
  return <NavbarView contactEmail={await getContactEmail()} />;
}
