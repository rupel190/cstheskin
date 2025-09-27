import type { Handle } from "@sveltejs/kit";

// Cookie-based authentication is handled per-endpoint, not globally
export const handle: Handle = async ({ event, resolve }) => {
  return resolve(event);
};

