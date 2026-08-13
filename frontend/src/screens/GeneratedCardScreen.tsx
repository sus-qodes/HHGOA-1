import { useEffect, useRef, useState } from "react";

import type { GeneratedBuilderCard } from "../app/app-types";
import { GeneratorHeader } from "../components/GeneratorHeader";
import { StepIndicator } from "../components/StepIndicator";
import { runtimeConfig } from "../config/runtime";
import { downloadCardPng } from "../features/download";
import {
  HostedShareError,
  buildBuilderPassXShareText,
  buildXIntentUrl,
  createHostedShare,
} from "../features/share";
import { useObjectUrl } from "../hooks/useObjectUrl";
import { useScreenFocus } from "../hooks/useScreenFocus";

export interface GeneratedCardScreenProps {
  readonly card: GeneratedBuilderCard;
  readonly onMakeAnother: () => void;
}

type ShareStatus = "preparing" | "ready" | "error";

interface ShareState {
  readonly status: ShareStatus;
  readonly intentUrl?: string;
  readonly hostedUrl?: string;
  readonly message?: string;
}

function retryMessage(error: HostedShareError): string {
  if (error.retryAfter !== undefined && error.retryAfter.seconds > 0) {
    return `${error.detail} Try again in about ${String(error.retryAfter.seconds)} seconds.`;
  }
  return error.detail;
}

export default function GeneratedCardScreen({
  card,
  onMakeAnother,
}: GeneratedCardScreenProps) {
  const [shareState, setShareState] = useState<ShareState>({ status: "preparing" });
  const [notice, setNotice] = useState<string | null>(null);
  const previewUrl = useObjectUrl(card.blob);
  const headingRef = useScreenFocus<HTMLHeadingElement>();
  const clickedWhilePreparingRef = useRef(false);

  useEffect(() => {
    let active = true;

    async function publishInBackground() {
      setShareState({ status: "preparing" });
      try {
        const hosted = await createHostedShare(card.blob, {
          backendOrigin: runtimeConfig.backendOrigin,
        });
        if (!active) return;
        const intentUrl = buildXIntentUrl(
          hosted.url,
          buildBuilderPassXShareText(runtimeConfig.publicAppUrl),
        );
        setShareState({
          status: "ready",
          intentUrl,
          hostedUrl: hosted.url,
        });

        if (clickedWhilePreparingRef.current) {
          clickedWhilePreparingRef.current = false;
          window.open(intentUrl, "_blank", "noopener,noreferrer");
        }
      } catch (error) {
        if (!active) return;
        setShareState({
          status: "error",
          message:
            error instanceof HostedShareError
              ? retryMessage(error)
              : "Could not create public link. You can still download your card.",
        });
      }
    }

    void publishInBackground();

    return () => {
      active = false;
    };
  }, [card.blob]);

  function handleDownload() {
    downloadCardPng(card.blob, card.name);
    setNotice(`Downloaded ${card.filename}`);
  }

  function handleHostedXShare() {
    setNotice(null);

    if (shareState.status === "ready" && shareState.intentUrl !== undefined) {
      window.open(shareState.intentUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (shareState.status === "preparing") {
      clickedWhilePreparingRef.current = true;
      setNotice("Preparing your unique share link... It will open in a new tab in a moment!");
      return;
    }

    if (shareState.status === "error") {
      setShareState({ status: "preparing" });
      clickedWhilePreparingRef.current = true;
      void createHostedShare(card.blob, {
        backendOrigin: runtimeConfig.backendOrigin,
      })
        .then((hosted) => {
          const intentUrl = buildXIntentUrl(
            hosted.url,
            buildBuilderPassXShareText(runtimeConfig.publicAppUrl),
          );
          setShareState({
            status: "ready",
            intentUrl,
            hostedUrl: hosted.url,
          });
          window.open(intentUrl, "_blank", "noopener,noreferrer");
        })
        .catch((error: unknown) => {
          setShareState({
            status: "error",
            message:
              error instanceof HostedShareError
                ? retryMessage(error)
                : "Could not create public link. Please try again.",
          });
        });
    }
  }

  return (
    <div className="result-page text-studio-paper">
      <div
        aria-hidden="true"
        className="result-ambient-card"
        style={
          previewUrl === null
            ? undefined
            : { backgroundImage: `url(${JSON.stringify(previewUrl)})` }
        }
      />

      <GeneratorHeader />

      <main className="result-main screen-enter">
        <section className="result-card-panel" aria-label="Generated Builder ID">
          <StepIndicator active="result" />
          <div className="result-card-stage">
            {previewUrl === null ? (
              <div
                aria-label="Preparing card preview"
                className="result-card-placeholder"
                role="img"
                style={{
                  aspectRatio: `${String(card.metadata.width)} / ${String(card.metadata.height)}`,
                }}
              />
            ) : (
              <img
                alt={`${card.name}'s HH Goa 2026 Builder ID`}
                className="result-card-image"
                height={card.metadata.height}
                src={previewUrl}
                width={card.metadata.width}
              />
            )}
          </div>
        </section>

        <section className="result-content" aria-labelledby="result-heading">
          <p className="result-eyebrow">YOUR BUILDER ID IS READY</p>
          <h1
            className="result-headline"
            id="result-heading"
            lang="hi"
            ref={headingRef}
            tabIndex={-1}
          >
            पास तैयार
          </h1>
          <p className="result-supporting-copy">
            Your HH Goa 2026 Builder ID is ready to download and share.
          </p>

          <div className="result-builder-window studio-paper-grain">
            <div aria-hidden="true" className="result-window-controls">
              <span>−</span><span>□</span><span>×</span>
            </div>
            <dl>
              <div>
                <dt>Builder class</dt>
                <span aria-hidden="true">//</span>
                <dd>{card.builderTitle}</dd>
              </div>
              <div>
                <dt>Builder ID</dt>
                <span aria-hidden="true">//</span>
                <dd>{card.builderId}</dd>
              </div>
            </dl>
          </div>

          <div aria-label="Builder ID actions" className="result-actions" role="group">
            <button
              aria-label="DOWNLOAD PNG"
              className="result-action result-action-download"
              onClick={handleDownload}
              type="button"
            >
              <span>DOWNLOAD PNG</span>
              <span aria-hidden="true">↓</span>
            </button>
            {shareState.status === "ready" && shareState.intentUrl ? (
              <a
                aria-label="SHARE ON X"
                className="result-action result-action-share"
                href={shareState.intentUrl}
                onClick={(event) => {
                  event.preventDefault();
                  handleHostedXShare();
                }}
                rel="noopener noreferrer"
                target="_blank"
              >
                <span>SHARE ON X</span>
                <span aria-hidden="true">↗</span>
              </a>
            ) : (
              <button
                aria-busy={shareState.status === "preparing"}
                aria-label="SHARE ON X"
                className="result-action result-action-share"
                onClick={handleHostedXShare}
                type="button"
              >
                <span>
                  {shareState.status === "preparing"
                    ? "PREPARING LINK..."
                    : "SHARE ON X"}
                </span>
                <span aria-hidden="true">
                  {shareState.status === "preparing" ? "⏳" : "↗"}
                </span>
              </button>
            )}
            <button
              className="result-action result-action-another"
              onClick={onMakeAnother}
              type="button"
            >
              <span>MAKE ANOTHER CARD</span>
              <span aria-hidden="true">↻</span>
            </button>
          </div>

          <p className="result-hashtag">
            Includes <strong>#FrameInGoa</strong>
          </p>

          {shareState.message === undefined ? null : (
            <p
              aria-live="polite"
              className="result-status"
              role={shareState.status === "error" ? "alert" : "status"}
            >
              {shareState.message}
            </p>
          )}
          {notice === null ? null : (
            <p aria-live="polite" className="result-status" role="status">
              {notice}
            </p>
          )}
        </section>
      </main>

      <footer aria-label="Generator footer" className="result-footer">
        <span>Built at : FOR THE STUDENTS</span>
        {" "}
        <span>
          CHECKOUT: {" "}
          <a href="https://hhgoa.com/" rel="noopener noreferrer" target="_blank">
            https://hhgoa.com/
          </a>
        </span>
      </footer>
    </div>
  );
}
