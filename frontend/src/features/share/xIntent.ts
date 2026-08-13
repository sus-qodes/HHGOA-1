import { parseHttpUrl } from "./shareValidation";

export const X_HASHTAGS = "FrameInGoa,HHGoa2026";
export const DEFAULT_X_SHARE_TEXT =
  "PACK YOUR BAGS! 🌴⚡️ Just locked in my official Builder Pass for Hacker House Goa 2026 with @247pmstudio.\n\nSee you in Goa, builders. We're going all in! 🚀🔥\n\nFrame your own Builder ID:";

const X_INTENT_URL = "https://x.com/intent/tweet";

export function buildBuilderPassXShareText(publicAppUrl: string): string {
  const parsedAppUrl = parseHttpUrl(publicAppUrl, "Public app URL");
  return `${DEFAULT_X_SHARE_TEXT}\n${parsedAppUrl.origin}\n\n`;
}

export function buildXIntentUrl(
  shareUrl: string,
  text: string = DEFAULT_X_SHARE_TEXT,
): string {
  const parsedShareUrl = parseHttpUrl(shareUrl, "Hosted share URL");
  if (text.trim() === "") {
    throw new TypeError("X share text cannot be empty.");
  }

  const intent = new URL(X_INTENT_URL);
  intent.searchParams.set("text", text);
  intent.searchParams.set("hashtags", X_HASHTAGS);
  intent.searchParams.set("url", parsedShareUrl.toString());
  return intent.toString();
}

export function isXIntentUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "x.com" &&
      parsed.pathname === "/intent/tweet"
    );
  } catch {
    return false;
  }
}
