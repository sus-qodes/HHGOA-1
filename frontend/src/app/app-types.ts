import type {
  BuilderCardRenderMetadata,
  BuilderFrameId,
  BuilderTitle,
} from "../features/card-renderer";

export type AppScreen = "intro" | "create" | "result";

export interface GeneratedBuilderCard {
  readonly blob: Blob;
  readonly filename: string;
  readonly builderTitle: BuilderTitle;
  readonly builderId: string;
  readonly name: string;
  readonly stackRole: string;
  readonly teamName?: string;
  readonly xUsername?: string;
  readonly frameId: BuilderFrameId;
  readonly metadata: BuilderCardRenderMetadata;
}
