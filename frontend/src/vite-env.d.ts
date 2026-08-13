/// <reference types="vite/client" />

declare module "heic2any" {
  interface Heic2AnyOptions {
    readonly blob: Blob;
    readonly toType?: "image/jpeg" | "image/png" | "image/gif";
    readonly quality?: number;
    readonly multiple?: boolean;
  }

  export default function heic2any(
    options: Heic2AnyOptions,
  ): Promise<Blob | Blob[]>;
}
