import { isXIntentUrl } from "./xIntent";

export interface PreparingSharePopup {
  readonly closed: boolean;
  readonly location: Pick<Location, "replace">;
  readonly document?: Pick<Document, "body" | "createElement" | "title">;
  close(): void;
}

export type PreparingPopupOpener = (
  url: string,
  target: string,
  features: string,
) => PreparingSharePopup | null;

export interface OpenPreparingSharePopupOptions {
  readonly opener?: PreparingPopupOpener;
  readonly title?: string;
  readonly message?: string;
}

const POPUP_FEATURES = "popup,width=640,height=720,resizable=yes,scrollbars=yes";

function browserPopupOpener(
  url: string,
  target: string,
  features: string,
): PreparingSharePopup | null {
  return globalThis.window.open(url, target, features);
}

function renderPreparingState(
  popup: PreparingSharePopup,
  title: string,
  message: string,
): void {
  try {
    const popupDocument = popup.document;
    if (popupDocument === undefined) {
      return;
    }

    popupDocument.title = title;
    const status = popupDocument.createElement("p");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.textContent = message;
    popupDocument.body.replaceChildren(status);
  } catch {
    // A browser may restrict about:blank access. The popup can still navigate.
  }
}

/** Must be called directly inside the user's click handler, before any await. */
export function openPreparingSharePopup(
  options: OpenPreparingSharePopupOptions = {},
): PreparingSharePopup | null {
  const opener = options.opener ?? browserPopupOpener;
  const popup = opener("about:blank", "_blank", POPUP_FEATURES);
  if (popup === null) {
    return null;
  }

  renderPreparingState(
    popup,
    options.title ?? "Preparing your X share",
    options.message ?? "Creating a public image link...",
  );
  return popup;
}

export function navigatePreparingSharePopup(
  popup: PreparingSharePopup | null,
  xIntentUrl: string,
): boolean {
  if (popup === null || popup.closed || !isXIntentUrl(xIntentUrl)) {
    return false;
  }

  try {
    popup.location.replace(xIntentUrl);
    return true;
  } catch {
    return false;
  }
}

export function closePreparingSharePopup(
  popup: PreparingSharePopup | null,
): void {
  if (popup === null || popup.closed) {
    return;
  }

  try {
    popup.close();
  } catch {
    // Closing is best-effort when a browser has changed popup ownership.
  }
}
