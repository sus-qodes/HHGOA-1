import { randomBytes } from "node:crypto";

import {
  SHARE_ID_BYTES,
  SHARE_ID_PATTERN,
} from "../config/constants.js";

export function createShareId(): string {
  return randomBytes(SHARE_ID_BYTES).toString("base64url");
}

export function isShareId(value: string): boolean {
  return SHARE_ID_PATTERN.test(value);
}
