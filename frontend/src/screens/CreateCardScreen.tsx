import {
  type ChangeEvent,
  type DragEvent,
  type SyntheticEvent,
  useRef,
  useState,
  useEffect,
} from "react";

import type { GeneratedBuilderCard } from "../app/app-types";
import { ActionIcon } from "../components/ActionIcon";
import { BuilderClassField } from "../components/BuilderClassField";
import { CardFramePicker } from "../components/CardFramePicker";
import { GeneratorFooter } from "../components/GeneratorFooter";
import { GeneratorHeader } from "../components/GeneratorHeader";
import { GoaStickerRail } from "../components/GoaStickerRail";
import { PhotoAdjustModal } from "../components/PhotoAdjustModal";
import {
  BUILDER_TITLE_OPTIONS,
  DEFAULT_BUILDER_FRAME_ID,
  DEFAULT_BUILDER_TITLE,
  MAX_SOURCE_IMAGE_BYTES,
  PHOTO_ACCEPT_ATTRIBUTE,
  preloadBuilderCardAssets,
  renderBuilderCard,
  validateBuilderCardInput,
  type BuilderCardValidationErrors,
  type BuilderFrameId,
  type BuilderTitle,
} from "../features/card-renderer";
import { runtimeConfig } from "../config/runtime";
import { createHostedShare } from "../features/share";
import { useObjectUrl } from "../hooks/useObjectUrl";
import { useScreenFocus } from "../hooks/useScreenFocus";

export interface CreateCardScreenProps {
  readonly onGenerated: (card: GeneratedBuilderCard) => void;
  readonly isTransitioning?: boolean;
}

type FormErrors = BuilderCardValidationErrors & { readonly form?: string };
type FieldError = Exclude<keyof BuilderCardValidationErrors, "frameId">;

const inputClasses =
  "mt-1 min-h-9 w-full border border-studio-ink/75 bg-studio-paper-light px-3 text-sm text-studio-ink placeholder:text-studio-muted focus:border-studio-coral focus:outline-none";
const labelClasses =
  "text-xs font-medium uppercase tracking-[0.1em] text-studio-ink sm:text-[0.66rem]";

function maxPhotoSizeLabel(): string {
  return `${String(MAX_SOURCE_IMAGE_BYTES / (1024 * 1024))} MB`;
}

function nextBuilderTitle(current: BuilderTitle): BuilderTitle {
  const index = BUILDER_TITLE_OPTIONS.indexOf(current);
  return BUILDER_TITLE_OPTIONS[(index + 1) % BUILDER_TITLE_OPTIONS.length] ?? DEFAULT_BUILDER_TITLE;
}

export default function CreateCardScreen({
  onGenerated,
  isTransitioning = false,
}: CreateCardScreenProps) {
  const [rawPhoto, setRawPhoto] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [stackRole, setStackRole] = useState("");
  const [teamName, setTeamName] = useState("");
  const [techStack, setTechStack] = useState<readonly string[]>([]);
  const [techDraft, setTechDraft] = useState("");
  const [builderTitle, setBuilderTitle] =
    useState<BuilderTitle>(DEFAULT_BUILDER_TITLE);
  const [frameId, setFrameId] = useState<BuilderFrameId>(
    DEFAULT_BUILDER_FRAME_ID,
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const headingRef = useScreenFocus<HTMLHeadingElement>();
  const photoUrl = useObjectUrl(photo);
  const rawPhotoUrl = useObjectUrl(rawPhoto);

  const prewarmedRef = useRef<{
    readonly key: string;
    card: GeneratedBuilderCard;
    readonly abortController?: AbortController;
  } | null>(null);
  const prewarmEpochRef = useRef(0);

  const liveTechStack = [
    ...techStack,
    ...(techDraft.trim() !== "" ? [techDraft.trim()] : []),
  ].slice(0, 5);

  const inputKey = JSON.stringify({
    name: name.trim(),
    stackRole: stackRole.trim(),
    teamName: teamName.trim(),
    techStack: liveTechStack,
    builderTitle,
    frameId,
    photoName: photo?.name,
    photoSize: photo?.size,
    photoLastMod: photo?.lastModified,
  });

  useEffect(() => {
    const warmAllCards = window.setTimeout(() => {
      void preloadBuilderCardAssets().catch(() => {
        // Selecting or rendering the card retries any failed artwork load.
      });
    }, 0);
    return () => {
      window.clearTimeout(warmAllCards);
    };
  }, []);

  // Local GPU canvas pre-rendering and background hosted-share pre-warming
  useEffect(() => {
    const input = {
      photo,
      name,
      stackRole,
      teamName,
      techStack: liveTechStack,
      builderTitle,
      frameId,
    };

    const validationErrors = validateBuilderCardInput(input);
    if (Object.keys(validationErrors).length > 0) {
      if (prewarmedRef.current !== null && prewarmedRef.current.key !== inputKey) {
        prewarmedRef.current.abortController?.abort();
        prewarmedRef.current = null;
      }
      return;
    }

    if (prewarmedRef.current?.key === inputKey) {
      return;
    }

    // Cancel previous in-flight background upload if input changed
    if (prewarmedRef.current !== null) {
      prewarmedRef.current.abortController?.abort();
    }

    prewarmEpochRef.current += 1;
    const currentEpoch = prewarmEpochRef.current;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const card = await renderBuilderCard(input);
          if (prewarmEpochRef.current !== currentEpoch) {
            return;
          }

          const controller = new AbortController();
          const uploadPromise = createHostedShare(card.blob, {
            backendOrigin: runtimeConfig.backendOrigin,
            signal: controller.signal,
          });

          const prewarmedCard: GeneratedBuilderCard = {
            ...card,
            prewarmedSharePromise: uploadPromise,
          };

          prewarmedRef.current = {
            key: inputKey,
            card: prewarmedCard,
            abortController: controller,
          };

          uploadPromise
            .then((hosted) => {
              if (
                prewarmEpochRef.current === currentEpoch &&
                prewarmedRef.current?.key === inputKey
              ) {
                prewarmedRef.current.card = {
                  ...prewarmedRef.current.card,
                  prewarmedShare: hosted,
                };
              }
            })
            .catch(() => {
              // Best-effort background upload
            });
        } catch {
          // Pre-rendering is best-effort local optimization
        }
      })();
    }, 250);

    return () => {
      prewarmEpochRef.current += 1;
      window.clearTimeout(timer);
    };
  }, [
    inputKey,
    photo,
    name,
    stackRole,
    teamName,
    liveTechStack,
    builderTitle,
    frameId,
  ]);

  function warmSelectedCard(selectedFrameId: BuilderFrameId) {
    void preloadBuilderCardAssets(selectedFrameId).catch(() => {
      // Generation retries the asset and reports a useful error if it still fails.
    });
  }

  function clearError(field: FieldError | "frameId") {
    setErrors((current) =>
      Object.fromEntries(
        Object.entries(current).filter(
          ([key]) => key !== field && key !== "form",
        ),
      ),
    );
  }

  function choosePhoto(file: File | null) {
    setRawPhoto(file);
    setPhoto(file);
    clearError("photo");
    if (file !== null) {
      setIsAdjustModalOpen(true);
    }
  }

  function removePhoto() {
    choosePhoto(null);
    setIsDragging(false);
    if (inputRef.current !== null) {
      inputRef.current.value = "";
    }
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    choosePhoto(event.target.files?.item(0) ?? null);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    choosePhoto(event.dataTransfer.files.item(0));
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = {
      photo,
      name,
      stackRole,
      teamName,
      techStack: liveTechStack,
      builderTitle,
      frameId,
    };
    const validationErrors = validateBuilderCardInput(input);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});

    // If card was already rendered on canvas in memory, pass immediately (0ms!)
    const prewarmed = prewarmedRef.current;
    if (prewarmed !== null && prewarmed.key === inputKey) {
      onGenerated(prewarmed.card);
      return;
    }

    setIsGenerating(true);
    try {
      const card = await renderBuilderCard(input);
      const uploadPromise = createHostedShare(card.blob, {
        backendOrigin: runtimeConfig.backendOrigin,
      });
      uploadPromise.catch(() => {
        // Handled by GeneratedCardScreen
      });
      onGenerated({
        ...card,
        prewarmedSharePromise: uploadPromise,
      });
    } catch (error) {
      setErrors({
        form:
          error instanceof Error
            ? error.message
            : "We could not generate this card. Please try again.",
      });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="generator-app studio-speckle text-studio-ink">
      <div className="generator-stage">
        <div
          className={`transition-opacity duration-1000 ${
            isTransitioning ? "opacity-0" : "opacity-100"
          }`}
        >
          <GeneratorHeader />
        </div>

        <main className="generator-main">
          <div className="generator-intro">
            <p className="mb-2 text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-studio-yellow sm:text-xs">
              A BUILDER IN THE MAKING
            </p>
            <h1
              aria-label="BUILD YOUR HH GOA ID"
              className="generator-screen-heading relative w-fit font-studio-display text-[clamp(4rem,11vh,6.4rem)] leading-[0.83] tracking-[0.025em] text-studio-paper"
              ref={headingRef}
              tabIndex={-1}
            >
              <span className="block">BUILD YOUR</span>
              <span className="block">HH GOA ID</span>
              <span
                className="studio-hindi-sticker absolute bottom-[0.06em] right-[-1rem] whitespace-nowrap bg-studio-coral px-3 py-1 text-[0.22em] font-black leading-none tracking-normal text-studio-paper"
                lang="hi"
              >
                अपना बनाओ
              </span>
            </h1>
            <p className="mt-3 text-xs font-medium lowercase tracking-[0.27em] text-studio-yellow sm:text-sm">
              one card · one builder · one story
            </p>
          </div>

          <CardFramePicker
            builderTitle={builderTitle}
            className="generator-selector"
            error={errors.frameId}
            name={name}
            onSelect={(selectedFrameId) => {
              setFrameId(selectedFrameId);
              clearError("frameId");
              warmSelectedCard(selectedFrameId);
            }}
            photoUrl={photoUrl}
            selected={frameId}
            stackRole={stackRole}
            teamName={teamName}
            techStack={liveTechStack}
          />

          <form
            className="generator-form studio-paper-grain overflow-hidden rounded-[1.05rem] border-2 border-studio-ink shadow-[8px_9px_0_var(--color-studio-green-dark)]"
            id="pass-details"
            noValidate
            onSubmit={(event) => void handleSubmit(event)}
          >
            <div className="generator-form-header flex min-h-12 items-center justify-between gap-4 border-b-2 border-studio-ink px-5 py-2.5 sm:px-7">
              <div className="flex items-center gap-3">
                <svg
                  aria-hidden="true"
                  className="size-5 text-studio-ink"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 21V8M12 9C8 4 4 5 3 8C7 8 10 9 12 12M12 9C16 4 20 5 21 8C17 8 14 9 12 12M12 8C10 4 12 2 14 2C16 5 15 7 12 9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
                </svg>
                <p className="text-sm font-medium uppercase tracking-[0.17em] text-studio-ink sm:text-base">
                  Pass details
                </p>
              </div>
              <span
                aria-hidden="true"
                className="whitespace-nowrap text-base tracking-[0.4em] text-studio-ink"
              >
                − □ ×
              </span>
            </div>

            <div className="generator-form-body space-y-2 px-5 pb-6 pt-4 sm:px-7">
              <div>
                <label className={labelClasses} htmlFor="builder-photo">
                  Profile photo (optional)
                </label>
                <div
                  className={`generator-upload relative mt-1 grid min-h-20 place-items-center overflow-hidden border-2 border-dashed p-2 text-center transition-colors ${isDragging ? "border-studio-coral bg-studio-yellow/15" : errors.photo === undefined ? "border-studio-ink/70" : "border-studio-coral"}`}
                  onClick={() => inputRef.current?.click()}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => {
                    setIsDragging(false);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                  }}
                  onDrop={handleDrop}
                  role="presentation"
                >
                  <div>
                    <ActionIcon
                      className="mx-auto rotate-[-90deg] text-studio-ink"
                      label="Upload profile photo"
                      name="arrow"
                      size={26}
                      decorative={false}
                    />
                    <p className="mt-2 text-xs font-medium uppercase tracking-[0.08em] text-studio-ink sm:text-sm">
                      {photo === null ? "Drop or tap to upload" : "Photo selected"}
                    </p>
                    <p className="mt-1 max-w-[28rem] truncate text-[0.6rem] uppercase tracking-[0.08em] text-studio-muted sm:text-[0.65rem]">
                      {photo === null
                        ? `JPG · PNG · WEBP · HEIC · MAX ${maxPhotoSizeLabel()}`
                        : photo.name}
                    </p>
                  </div>
                  <input
                    accept={PHOTO_ACCEPT_ATTRIBUTE}
                    aria-label="Profile photo"
                    aria-describedby={
                      errors.photo === undefined
                        ? "photo-help"
                        : "photo-help photo-error"
                    }
                    aria-invalid={errors.photo !== undefined}
                    className="sr-only"
                    id="builder-photo"
                    onChange={handlePhotoChange}
                    ref={inputRef}
                    type="file"
                  />
                </div>
                <div className="generator-photo-meta mt-1 flex min-h-4 items-start justify-between gap-3">
                  <div>
                    <p className="sr-only" id="photo-help">
                      Required. JPG, PNG, WebP or HEIC up to {maxPhotoSizeLabel()}.
                    </p>
                    <p className="text-[0.62rem] text-studio-coral" id="photo-error">
                      {errors.photo}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      className="text-[0.62rem] text-studio-ink underline decoration-studio-yellow decoration-2 underline-offset-3"
                      onClick={() => inputRef.current?.click()}
                      type="button"
                    >
                      {photo === null ? "Choose photo" : "Replace photo"}
                    </button>
                    {rawPhoto === null ? null : (
                      <button
                        className="inline-flex min-h-7 items-center gap-1 border border-studio-ink/45 bg-studio-yellow/20 px-2 text-[0.6rem] font-bold uppercase text-studio-ink transition-colors hover:border-studio-yellow hover:bg-studio-yellow"
                        onClick={() => {
                          setIsAdjustModalOpen(true);
                        }}
                        type="button"
                      >
                        <span>✂ Adjust</span>
                      </button>
                    )}
                    {photo === null ? null : (
                      <button
                        aria-label="Remove photo"
                        className="inline-flex min-h-7 items-center gap-1 border border-studio-ink/45 px-2 text-[0.6rem] uppercase text-studio-ink transition-colors hover:border-studio-coral hover:text-studio-coral"
                        onClick={removePhoto}
                        type="button"
                      >
                        <svg
                          aria-hidden="true"
                          className="size-3"
                          fill="none"
                          viewBox="0 0 16 16"
                        >
                          <path
                            d="M3.5 4.5h9m-6.5 0V3.2h4v1.3m-5.5 0 .55 8.3h5.9l.55-8.3M6.7 6.5v4.2m2.6-4.2v4.2"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.2"
                          />
                        </svg>
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <TextField
                autoComplete="name"
                error={errors.name}
                id="name"
                label="Full name"
                maxLength={60}
                onChange={(value) => {
                  setName(value);
                  clearError("name");
                }}
                placeholder="Your full name"
                required
                value={name}
              />
              <TextField
                autoComplete="organization-title"
                error={errors.stackRole}
                id="stack-role"
                label="Stack / role"
                maxLength={30}
                onChange={(value) => {
                  setStackRole(value);
                  clearError("stackRole");
                }}
                placeholder="Builder, SDE, Fullstack, Rust"
                required
                value={stackRole}
              />
              <TextField
                autoComplete="organization"
                error={errors.teamName}
                id="team-name"
                label="Team name"
                maxLength={30}
                onChange={(value) => {
                  setTeamName(value);
                  clearError("teamName");
                }}
                placeholder="Your team"
                required
                value={teamName}
              />
              <TechStackField
                error={errors.techStack}
                onAdd={(tag) => {
                  if (techStack.length < 5) {
                    setTechStack((current) => [...current, tag]);
                    setTechDraft("");
                    clearError("techStack");
                  }
                }}
                onDraftChange={setTechDraft}
                onRemove={(index) => {
                  setTechStack((current) =>
                    current.filter((_, idx) => idx !== index),
                  );
                }}
                techStack={techStack}
              />

              <BuilderClassField
                onRegenerate={() => {
                  setBuilderTitle((current) => nextBuilderTitle(current));
                  clearError("builderTitle");
                }}
                value={builderTitle}
              />

              {errors.form === undefined ? null : (
                <p
                  className="border-l-4 border-studio-coral bg-studio-paper-light p-3 text-xs leading-5 text-studio-ink"
                  role="alert"
                >
                  {errors.form}
                </p>
              )}

              <button
                className="studio-generate-button relative mt-1 grid min-h-14 w-full grid-cols-[auto_1fr_auto] items-center gap-3 overflow-visible rounded-[3px] border-2 border-studio-paper bg-[#063e2d] px-3 py-1 text-studio-paper shadow-[5px_6px_0_#011f16] transition-[background-color,color,box-shadow,transform] duration-150 hover:bg-studio-yellow hover:text-studio-ink active:translate-x-0.5 active:translate-y-0.5 active:shadow-[3px_4px_0_#011f16] disabled:cursor-not-allowed disabled:opacity-65 sm:min-h-[3.5rem]"
                aria-disabled={isGenerating}
                type="submit"
              >
                <span aria-hidden="true" className="font-mono text-lg font-bold">
                  &gt;
                </span>
                <span className="whitespace-nowrap text-center font-studio-display text-[clamp(1.55rem,8.1vw,3.1rem)] leading-none tracking-[0.025em]">
                  {isGenerating ? "GENERATING..." : "GENERATE MY CARD"}
                </span>
                <span
                  aria-hidden="true"
                  className="grid size-10 place-items-center bg-studio-paper text-xl leading-none text-studio-ink"
                >
                  ↵
                </span>
              </button>
            </div>
          </form>
          <GoaStickerRail />
          <PhotoAdjustModal
            frameId={frameId}
            isOpen={isAdjustModalOpen}
            onApply={(croppedFile) => {
              setPhoto(croppedFile);
              clearError("photo");
            }}
            onClose={() => {
              setIsAdjustModalOpen(false);
            }}
            onDraftCrop={(croppedFile) => {
              setPhoto(croppedFile);
              clearError("photo");
            }}
            photoUrl={rawPhotoUrl}
          />
    </main>
        <GeneratorFooter />
      </div>
    </div>
  );
}

interface TextFieldProps {
  readonly autoComplete?: string;
  readonly error?: string;
  readonly id: string;
  readonly label: string;
  readonly maxLength: number;
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
  readonly required?: boolean;
  readonly value: string;
}

function TextField({
  autoComplete,
  error,
  id,
  label,
  maxLength,
  onChange,
  placeholder,
  required = false,
  value,
}: TextFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <label className={labelClasses} htmlFor={id}>
          {label}
        </label>
        <span aria-hidden="true" className="text-[0.58rem] text-studio-muted">
          {value.length} / {maxLength}
        </span>
      </div>
      <input
        aria-describedby={error === undefined ? undefined : errorId}
        aria-invalid={error !== undefined}
        autoComplete={autoComplete}
        className={inputClasses}
        id={id}
        maxLength={maxLength}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        placeholder={placeholder}
        required={required}
        value={value}
      />
      <p className="generator-field-error mt-0.5 min-h-3 text-[0.6rem] text-studio-coral" id={errorId}>
        {error}
      </p>
    </div>
  );
}

interface TechStackFieldProps {
  readonly techStack: readonly string[];
  readonly onAdd: (tag: string) => void;
  readonly onRemove: (index: number) => void;
  readonly onDraftChange?: (draft: string) => void;
  readonly error?: string;
}

const POPULAR_SUGGESTIONS = [
  "React",
  "TypeScript",
  "Node.js",
  "Python",
  "Rust",
  "Go",
  "AI/ML",
  "Solidity",
];

function TechStackField({
  techStack,
  onAdd,
  onRemove,
  onDraftChange,
  error,
}: TechStackFieldProps) {
  const [inputVal, setInputVal] = useState("");

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      if (inputVal.trim() !== "" && techStack.length < 5) {
        onAdd(inputVal.trim());
        setInputVal("");
        onDraftChange?.("");
      }
    }
  }

  function handleAdd() {
    if (inputVal.trim() !== "" && techStack.length < 5) {
      onAdd(inputVal.trim());
      setInputVal("");
      onDraftChange?.("");
    }
  }

  const unusedSuggestions = POPULAR_SUGGESTIONS.filter(
    (sug) => !techStack.some((t) => t.toLowerCase() === sug.toLowerCase()),
  ).slice(0, 5);

  return (
    <div className="space-y-1.5">
      <div className="flex items-end justify-between gap-3">
        <label className={labelClasses} htmlFor="tech-stack-input">
          Tech stack (1 to 5 required)
        </label>
        <span aria-hidden="true" className="text-[0.58rem] text-studio-muted">
          {techStack.length} / 5
        </span>
      </div>

      {/* Pill Tags Display */}
      {techStack.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 py-0.5">
          {techStack.map((tag, idx) => (
            <span
              key={`${tag}-${String(idx)}`}
              className="inline-flex items-center gap-1.5 rounded bg-[#06452f] px-2.5 py-1 font-mono text-xs font-semibold text-studio-paper shadow-sm"
            >
              <span>{tag}</span>
              <button
                aria-label={`Remove ${tag}`}
                className="ml-0.5 text-xs font-bold text-studio-yellow hover:text-studio-coral focus:outline-none"
                onClick={() => {
                  onRemove(idx);
                }}
                type="button"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {/* Input Field & Add Button */}
      {techStack.length < 5 ? (
        <div className="flex items-center gap-2">
          <input
            className={inputClasses}
            id="tech-stack-input"
            maxLength={20}
            onChange={(e) => {
              setInputVal(e.target.value);
              onDraftChange?.(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type tech & press Enter (e.g. React)"
            type="text"
            value={inputVal}
          />
          <button
            className="mt-1 inline-flex min-h-9 shrink-0 items-center justify-center rounded border border-studio-ink bg-studio-yellow px-3 font-mono text-xs font-bold uppercase text-studio-ink transition-colors hover:bg-studio-coral hover:text-studio-paper disabled:opacity-50"
            disabled={inputVal.trim() === ""}
            onClick={handleAdd}
            type="button"
          >
            + Add
          </button>
        </div>
      ) : null}

      {/* Quick Suggested Tags */}
      {techStack.length < 5 && unusedSuggestions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          <span className="text-[0.58rem] uppercase tracking-wider text-studio-muted">
            Quick add:
          </span>
          {unusedSuggestions.map((sug) => (
            <button
              className="rounded border border-studio-ink/30 bg-studio-paper/40 px-1.5 py-0.5 font-mono text-[0.6rem] text-studio-ink transition-colors hover:border-studio-coral hover:bg-studio-yellow/30"
              key={sug}
              onClick={() => {
                onAdd(sug);
              }}
              type="button"
            >
              + {sug}
            </button>
          ))}
        </div>
      ) : null}

      {error === undefined ? null : (
        <p className="mt-0.5 text-[0.6rem] text-studio-coral">{error}</p>
      )}
    </div>
  );
}
