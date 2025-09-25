import type { RequestHandler } from '@sveltejs/kit';
import { initPlayerSession } from '$lib/auth';
import { nextUnprogressedSkin } from '$lib/db';

// 🎮 Init player session: Set locals, return skin and cookie
export const GET: RequestHandler = async ({ locals, cookies, platform }) => {
  const db = platform!.env // No check necessary, breaks either way without fallback

  try {
    await initPlayerSession(db, cookies, locals);
  } catch (err) {
    console.warn("initPlayerSession error: ", err)
    return new Response("Unverifiable user ID. Delete cookie and try again.", {
      status: 403,
      headers: {
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  try {
    const skin = await nextUnprogressedSkin(db, locals.id);
    // Return skin
    return new Response(JSON.stringify({ uuid: skin?.uuid }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": `user=${cookies.get("token")}; Path=/; HttpOnly`,
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err) {
    console.error(err);
    return new Response("No unprogressed skins found!", {
      status: 404,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Set-Cookie": `user=${cookies.get("token")}; Path=/; HttpOnly`,
      }
    });
  }
};


