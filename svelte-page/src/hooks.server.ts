import type { Handle } from "@sveltejs/kit";
import { verifyToken } from "$lib/auth";
import { fetchPlayerId } from "$lib/db";

// Authentication is handled per-endpoint, not globally
// export const handle: Handle = async ({ event, resolve }) => {
//   try {
//     const token = event.cookies.get('user');
//     const uuid = await verifyToken(token ?? '');
//     const id = await fetchPlayerId(event.platform!.env, uuid);

//     event.locals.uuid = uuid;
//     event.locals.id = id;
//   } catch {
//     event.locals.uuid = undefined;
//     event.locals.id = undefined;
//   }

//   return resolve(event);
// };

