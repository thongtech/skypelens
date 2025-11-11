import { DEBUG } from "../constants/debug";

export function debugLog(...args: unknown[]): void {
  if (DEBUG) {
    console.log(...args);
  }
}
