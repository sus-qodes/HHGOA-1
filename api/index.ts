import type { IncomingMessage, ServerResponse } from "node:http";
import handler from "../backend/src/app.js";

export default async function (req: IncomingMessage, res: ServerResponse): Promise<void> {
  return handler(req, res);
}
