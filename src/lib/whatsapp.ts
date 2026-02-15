/**
 * WhatsApp (UltraMsg) integration.
 * Templates and API credentials are stored in system_settings and fetched at send time.
 */

const DEFAULT_COUNTRY_CODE = "91";

const ULTRAMSG_BASE = "https://api.ultramsg.com";

/**
 * Format phone for WhatsApp: digits only, ensure country code.
 * If number doesn't start with a country code (e.g. 10 digits), prepend DEFAULT_COUNTRY_CODE.
 */
export function formatPhoneForWhatsApp(phone: string | null | undefined): string | null {
  if (!phone || typeof phone !== "string") return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 0) return null;
  if (digits.length <= 10) {
    return `${DEFAULT_COUNTRY_CODE}${digits}`;
  }
  return digits;
}

/**
 * Replace placeholders like {{name}} with values from variables.
 * Keys are case-sensitive; missing keys become empty string.
 */
export function replacePlaceholders(
  template: string,
  variables: Record<string, string>
): string {
  let out = template;
  for (const [key, value] of Object.entries(variables)) {
    out = out.replace(new RegExp(`\\{\\{${escapeRegExp(key)}\\}\\}`, "g"), value ?? "");
  }
  return out;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const MAX_DESCRIPTION_LENGTH = 200;

/**
 * Strip HTML tags and limit length for safe use in WhatsApp messages.
 * Use for {{task_description}} placeholder.
 */
export function sanitizeTaskDescription(description: string | null | undefined): string {
  if (description == null || typeof description !== "string") return "";
  const stripped = description.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  if (stripped.length <= MAX_DESCRIPTION_LENGTH) return stripped;
  return stripped.slice(0, MAX_DESCRIPTION_LENGTH) + "…";
}

/**
 * Send a text message via UltraMsg API.
 * POST https://api.ultramsg.com/{instance_id}/messages/chat?token=...
 * Body: { to, body }
 */
export async function sendViaUltraMsg(
  instanceId: string,
  token: string,
  to: string,
  message: string
): Promise<void> {
  if (!instanceId?.trim() || !token?.trim()) {
    throw new Error("WhatsApp not configured (instance ID and token required).");
  }
  console.log("[WhatsApp] Processed message (before send):", message);
  const url = `${ULTRAMSG_BASE}/${instanceId.trim()}/messages/chat?token=${encodeURIComponent(token.trim())}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: to.replace(/\D/g, ""),
      body: message,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`UltraMsg API error (${res.status}): ${text.slice(0, 200)}`);
  }
}

/**
 * Fetch latest settings from DB, resolve template by name, replace placeholders, and send.
 * Call from server (API route) with Supabase client that can read system_settings.
 */
export type TemplateName = "onboarding" | "task_assigned" | "task_watcher" | "task_updated";

export type SystemSettingsWhatsApp = {
  whatsapp_instance_id: string | null;
  whatsapp_token: string | null;
  template_onboarding: string | null;
  template_task_assigned: string | null;
  template_watcher: string | null;
  template_task_updated: string | null;
};

export function getTemplateByName(
  settings: SystemSettingsWhatsApp,
  name: TemplateName
): string | null {
  switch (name) {
    case "onboarding":
      return settings.template_onboarding;
    case "task_assigned":
      return settings.template_task_assigned;
    case "task_watcher":
      return settings.template_watcher;
    case "task_updated":
      return settings.template_task_updated ?? null;
    default:
      return null;
  }
}

export function isWhatsAppConfigured(settings: SystemSettingsWhatsApp): boolean {
  return !!(
    settings?.whatsapp_instance_id?.trim() &&
    settings?.whatsapp_token?.trim()
  );
}
