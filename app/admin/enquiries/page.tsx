import React from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { SetupNotice } from "@/components/admin/SetupNotice";
import { StatusPicker } from "@/components/admin/StatusPicker";
import { requireAdministrator } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { serverClient } from "@/lib/supabase/server";
import { setEnquiryStatus } from "./actions";

/**
 * Written enquiries, newest first.
 *
 * The whole message is shown rather than a truncated preview with a link to
 * the rest: these are a paragraph each, and a list of first lines is a list
 * nobody can triage from.
 */

export const dynamic = "force-dynamic";

const STATUSES = [
  { value: "new", label: "New" },
  { value: "in_progress", label: "Being handled" },
  { value: "replied", label: "Replied" },
  { value: "closed", label: "Closed" },
  { value: "spam", label: "Spam" },
];

interface Row {
  id: string;
  name: string;
  email: string;
  company: string | null;
  message: string;
  status: string;
  created_at: string;
  services: { title: string } | null;
}

export default async function Enquiries() {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const admin = await requireAdministrator();
  const supabase = await serverClient();

  const { data } = await supabase
    .from("enquiries")
    .select("id, name, email, company, message, status, created_at, services:service_id ( title )")
    .order("created_at", { ascending: false });

  const enquiries = (data ?? []) as unknown as Row[];

  return (
    <AdminShell
      admin={admin}
      title="Enquiries"
      description="Messages sent from the contact page. Replying happens in your own email — this is the record that it was answered."
    >
      {enquiries.length === 0 ? (
        <p className="text-sm text-foreground-secondary">No messages yet.</p>
      ) : (
        <ul className="border-t border-border-custom">
          {enquiries.map((enquiry) => (
            <li key={enquiry.id} className="border-b border-border-custom py-6">
              <div className="grid grid-cols-12 gap-x-8 gap-y-4">
                <div className="col-span-12 md:col-span-8">
                  <p className="text-base text-foreground">
                    {enquiry.name}
                    {enquiry.company ? (
                      <span className="text-foreground-secondary"> · {enquiry.company}</span>
                    ) : null}
                  </p>
                  <a
                    href={`mailto:${enquiry.email}`}
                    className="mt-1 block text-sm text-foreground-secondary break-all hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                  >
                    {enquiry.email}
                  </a>
                  <p className="mt-2 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-foreground-secondary">
                    {new Intl.DateTimeFormat("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(enquiry.created_at))}
                    {enquiry.services ? ` · ${enquiry.services.title}` : ""}
                  </p>

                  <p className="mt-4 max-w-xl text-sm leading-snug text-foreground whitespace-pre-wrap">
                    {enquiry.message}
                  </p>
                </div>

                <div className="col-span-12 md:col-span-3 md:col-start-10">
                  <StatusPicker
                    id={enquiry.id}
                    current={enquiry.status}
                    options={STATUSES}
                    action={setEnquiryStatus}
                    label={`Status for the enquiry from ${enquiry.name}`}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
