

export async function fetchImageBySkinUuid(env: App.Env, skinUuid: string, stage: number) {
  const image = await env.DEV_DB.prepare(`
      SELECT si.image_path
      FROM skin_images si
      JOIN skins s ON s.id = si.skin_id
      WHERE s.uuid = ? AND si.stage = ?
    `).bind(skinUuid, stage).first();
  if (!image) {
    throw new Error("Image for skin " + skinUuid + " stage " + stage + " not found.");
  }
  return image;
}

export async function fetchSkinByUuid(env: App.Env, skinUuid: string) {
  const skin = await env.DEV_DB.prepare(`SELECT id, uuid, name FROM skins WHERE uuid = ?`).bind(skinUuid).first()
  if (!skin) {
    throw new Error("Skin for " + skinUuid + " not found.");
  }
  return skin;
}

export async function getRandomUnsolvedSkin(env: App.Env, solvedSkinUuids: string[]): Promise<any> {
  let query = `SELECT uuid, name FROM skins`;
  let params: string[] = [];

  if (solvedSkinUuids.length > 0) {
    const placeholders = solvedSkinUuids.map(() => '?').join(',');
    query += ` WHERE uuid NOT IN (${placeholders})`;
    params = solvedSkinUuids;
  }

  query += ` ORDER BY RANDOM() LIMIT 1`;

  const stmt = env.DEV_DB.prepare(query);
  return params.length > 0 ? stmt.bind(...params).first() : stmt.first();
}

export async function getAllSkins(env: App.Env) {
  return await env.DEV_DB.prepare(`SELECT uuid, name FROM skins ORDER BY created_at ASC`).all();
}

