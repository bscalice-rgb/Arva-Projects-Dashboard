import { ZodError } from "zod";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/** Flatten a ZodError into a single human-readable message. */
export function zodMessage(err: ZodError): string {
  return err.issues
    .map((i) => {
      const path = i.path.join(".");
      return path ? `${path}: ${i.message}` : i.message;
    })
    .join("; ");
}
