import { IDuration } from "./types/duration";

export function sleepFor(t: IDuration): Promise<void> {
  return new Promise((resolve) => setTimeout(() => resolve(), t.ms));
}
