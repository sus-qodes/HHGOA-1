import { parseHttpUrl } from "./shareValidation";

export const X_HASHTAGS = "FrameInGoa,HHGoa2026,HackerHouseGoa";
export const DEFAULT_X_SHARE_TEXT =
  "Certified builder, certified vibes 🌴⚡️\n\nCooked up my official Builder Pass for Hacker House Goa 2026. Ocean breeze + late night commits, we are locked in! 🚀💻🔥\n\nCrafted with @247pmstudio 🎨✨\nClaim your pass:";

const X_INTENT_URL = "https://x.com/intent/tweet";

export function buildBuilderPassXShareText(): string {
  return DEFAULT_X_SHARE_TEXT;
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
