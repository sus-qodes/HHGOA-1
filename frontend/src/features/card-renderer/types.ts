import type { BuilderFrameId, BuilderTitle } from "./options";
export type { BuilderFrameId, BuilderTitle };

export interface BuilderCardInput {
  readonly photo?: File | null;
  readonly name: string;
  readonly stackRole: string;
  readonly teamName?: string;
  readonly techStack?: readonly string[];
  readonly builderTitle: BuilderTitle;
  readonly frameId: BuilderFrameId;
  readonly maxSourceBytes?: number;
}

export interface BuilderCardValidationInput {
  readonly photo?: File | null;
  readonly name: string;
  readonly stackRole: string;
  readonly teamName?: string;
  readonly techStack?: readonly string[];
  readonly builderTitle: string;
  readonly frameId: string;
  readonly maxSourceBytes?: number;
}

export interface BuilderCardValidationErrors {
  readonly photo?: string;
  readonly name?: string;
  readonly stackRole?: string;
  readonly teamName?: string;
  readonly techStack?: string;
  readonly builderTitle?: string;
  readonly frameId?: string;
}

export type BuilderCardRenderMetadata =
  | {
      readonly templateId: "builder-id-card01-v1";
      readonly templateVersion: 1;
      readonly width: 1134;
      readonly height: 1926;
      readonly mimeType: "image/png";
      readonly bytes: number;
    }
  | {
      readonly templateId: "builder-id-v1";
      readonly templateVersion: 1;
      readonly width: 1134;
      readonly height: 1926;
      readonly mimeType: "image/png";
      readonly bytes: number;
    };

export interface RenderedBuilderCard {
  readonly blob: Blob;
  readonly filename: string;
  readonly builderTitle: BuilderTitle;
  readonly builderId: string;
  readonly name: string;
  readonly stackRole: string;
  readonly teamName?: string;
  readonly techStack?: readonly string[];
  readonly frameId: BuilderFrameId;
  readonly metadata: BuilderCardRenderMetadata;
}
