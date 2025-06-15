import type { Cookies } from '@sveltejs/kit';

const SECRET = "super_secret_server_side_salt"; // TODO: move to env in prod!


export async function initPlayerSession(env: App.Env, cookies: Cookies, locals: App.Locals) {
  const player_token = cookies.get('user');

  // Init player
  if (!player_token) {
    locals.uuid = await createPlayer(env);
    locals.id = await fetchPlayerId(env, locals.uuid);
    cookies.set('user', await generateUserToken(locals.uuid), { path: '/', httpOnly: true }); // Prevents XSS: Only server can read cookie
    // await initPlayer(_playerId);
  } else {
    locals.uuid = await verifyToken(player_token);
    locals.id = await fetchPlayerId(env, locals.uuid);
  }
}


export async function createPlayer(env: App.Env) {
  const uuid = crypto.randomUUID()
  await insertPlayer(env, uuid);
  return uuid;
}

export async function generateUserToken(uuid: string) {
  const hash = await sha256(uuid + ":" + SECRET);
  return `${uuid}.${hash}`;
}

export async function verifyToken(token: string) {
  if (typeof token !== "string") {
    throw "token_type_not_string";
  }
  const [uuid, hash] = token.split(".");
  if (!uuid || !hash) {
    throw "token_format_invalid";
  }
  const expected = await sha256(uuid + ":" + SECRET);
  if (expected !== hash) {
    throw "token_not_matching";
  }
  return expected;
}

export async function sha256(msg: string) {
  const data = new TextEncoder().encode(msg);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}


