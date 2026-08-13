import { isBuilderFrameId, isBuilderTitle } from "./options";
import type {
  BuilderCardValidationErrors,
  BuilderCardValidationInput,
} from "./types";

export const MAX_SOURCE_IMAGE_BYTES = 20 * 1024 * 1024;
export const PHOTO_ACCEPT_ATTRIBUTE =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";

const supportedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

const supportedExtensions = /\.(?:jpe?g|png|webp|heic|heif)$/iu;

function formatByteLimit(bytes: number): string {
  if (bytes >= 1_048_576) return `${String(Math.floor(bytes / 1_048_576))}MB`;
  if (bytes >= 1024) return `${String(Math.floor(bytes / 1024))}KB`;
  return `${String(bytes)} bytes`;
}

export function normalizeDisplayText(value: string): string {
  return value.trim().replace(/\s+/gu, " ");
}

export function validatePhotoFile(
  file: File | null | undefined,
  maxBytes = MAX_SOURCE_IMAGE_BYTES,
): string | undefined {
  if (file === null || file === undefined) return "Please upload a photo for your card.";
  if (file.size === 0) return "This photo is empty. Choose another file.";
  if (file.size > maxBytes) {
    return `Choose a photo smaller than ${formatByteLimit(maxBytes)}.`;
  }
  const type = file.type.toLowerCase();
  if (!supportedTypes.has(type) && !supportedExtensions.test(file.name)) {
    return "Choose a JPG, PNG, WebP, HEIC or HEIF photo.";
  }
  return undefined;
}

export function validateBuilderText(
  name: string,
  stackRole: string,
): { readonly name?: string; readonly stackRole?: string } {
  const errors: { name?: string; stackRole?: string } = {};
  const normalizedName = normalizeDisplayText(name);
  const normalizedStackRole = normalizeDisplayText(stackRole);
  if (normalizedName.length < 2) errors.name = "Enter your full name.";
  else if (normalizedName.length > 60) errors.name = "Keep your name to 60 characters.";
  if (normalizedStackRole.length < 2) {
    errors.stackRole = "Enter your stack or role.";
  } else if (normalizedStackRole.length > 30) {
    errors.stackRole = "Keep your stack or role to 30 characters.";
  }
  return errors;
}

export function validateBuilderCardInput(
  input: BuilderCardValidationInput,
): BuilderCardValidationErrors {
  const errors: {
    photo?: string;
    name?: string;
    stackRole?: string;
    teamName?: string;
    techStack?: string;
    builderTitle?: string;
    frameId?: string;
  } = {
    ...validateBuilderText(input.name, input.stackRole),
  };

  const teamName = normalizeDisplayText(input.teamName ?? "");
  if (teamName.length < 2) {
    errors.teamName = "Enter your team name.";
  } else if (teamName.length > 30) {
    errors.teamName = "Keep your team name to 30 characters.";
  }

  const techStack = input.techStack ?? [];
  if (techStack.length === 0) {
    errors.techStack = "Add at least 1 tech stack item.";
  } else if (techStack.length > 5) {
    errors.techStack = "You can add up to 5 tech stack items.";
  }

  if (!isBuilderTitle(input.builderTitle)) {
    errors.builderTitle = "Choose a builder title.";
  }
  if (!isBuilderFrameId(input.frameId)) {
    errors.frameId = "Choose a card frame.";
  }

  const photoError = validatePhotoFile(input.photo, input.maxSourceBytes);
  if (photoError !== undefined) errors.photo = photoError;
  return errors;
}
