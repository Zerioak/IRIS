/**
 * Central configuration System for IRIS.
 * Sir, this module consolidates all environment variables and constants.
 */

export const CONFIG = {
  GEMINI: {
    API_KEY: import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== "undefined" ? process.env?.GEMINI_API_KEY : ""),
    MODELS: {
      LIVE: "gemini-3.1-flash-live-preview",
      CHAT: "gemini-3-flash-preview",
    }
  },
  SYSTEM: {
    NAME: "IRIS",
    VERSION: "2.5.0",
    IS_DEV: import.meta.env.DEV,
  },
  BACKEND: {
    BASE_URL: (import.meta as any).env?.VITE_API_URL || "",
  }
};

export function getApiKey(): string {
  const key = CONFIG.GEMINI.API_KEY;
  if (!key) {
    console.warn("IRIS WARNING: GEMINI_API_KEY is not defined in the environment matrix.");
  }
  return key;
}
