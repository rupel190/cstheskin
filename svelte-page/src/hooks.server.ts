import type { RequestHandler } from "@sveltejs/kit";
import { verifyToken } from "$lib/auth";
import { fetchPlayerId } from "$lib/db";

// export const handle: Handle = async ({ event, resolve }) => {
//   try {
//     const token = event.cookies.get('user');
//     const uuid = await verifyToken(token ?? '');
//     const id = await fetchPlayerId(uuid);
//
//     event.locals.uuid = uuid;
//     event.locals.id = id;
//   } catch {
//     event.locals.uuid = undefined;
//     event.locals.id = undefined;
//   }
//
//   return resolve(event);
// };

