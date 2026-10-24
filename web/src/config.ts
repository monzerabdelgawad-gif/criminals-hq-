export const API_URL: string = import.meta.env.VITE_API_URL || '';
export const GOOGLE_CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

/** No backend configured -> run on local demo data (for design / testing). */
export const DEMO = !API_URL;

export const POLL_MS = 20000;
export const MAX_UPLOAD_MB = 25;
