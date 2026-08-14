import "server-only";

import { serviceClient } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/config";

/**
 * Written enquiries: the path for people who do not want a call.
 *
 * The booking panel asks a visitor to pick a time, which is the right default
 * and the wrong only option. Somebody comparing three studios on a Tuesday
 * evening does not want to commit to a Thursday morning; they want to send a
 * paragraph and get an answer. Without this the site's honest advice was "email
 * us", and an email is a message nobody can track, assign or mark as answered.
 *
 * Written with the service role, because the public must be able to create an
 * enquiry without being able to read anyone else's. That is not a policy that
 * can be expressed as a row filter — "insert but never select" is a grant, and
 * the grant the public has on this table is none at all.
 */

export interface EnquiryInput {
  name: string;
  email: string;
  company?: string;
  /** A service slug, or undefined. */
  service?: string;
  message: string;
}

export interface EnquiryStore {
  readonly durable: boolean;
  create(input: EnquiryInput): Promise<{ id: string }>;
}

/** Development only. Goes nowhere, and says so. */
const memoryStore: EnquiryStore = {
  durable: false,
  async create() {
    return { id: "local" };
  },
};

function postgresStore(): EnquiryStore {
  return {
    durable: true,
    async create(input) {
      const supabase = serviceClient();

      let serviceId: string | null = null;
      if (input.service) {
        const { data } = await supabase
          .from("services")
          .select("id")
          .eq("slug", input.service)
          .maybeSingle();
        serviceId = (data as { id: string } | null)?.id ?? null;
      }

      const { data, error } = await supabase
        .from("enquiries")
        .insert({
          name: input.name,
          email: input.email,
          company: input.company ?? null,
          service_id: serviceId,
          message: input.message,
        })
        .select("id")
        .single();

      if (error) throw error;
      return { id: (data as { id: string }).id };
    },
  };
}

export function getEnquiryStore(): EnquiryStore {
  if (isSupabaseConfigured() && process.env.SUPABASE_SECRET_KEY) return postgresStore();
  return memoryStore;
}

/** Same rule as bookings: production does not accept into somewhere that forgets. */
export function storageAcceptsEnquiries(store: EnquiryStore) {
  return store.durable || process.env.NODE_ENV !== "production";
}
