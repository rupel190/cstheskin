const SECRET = "super_secret_server_side_salt"; // TODO: move to env in prod!

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		const { pathname } = url;

		const cookies = parseCookies(request.headers.get("cookie"));
		const userToken = cookies["user"];

		if (userToken) {
			const userUuid = await verifyToken(userToken);
			if (!userUuid) {
				// Invalid token
				return new Response("Unverifiable user ID. Delete cookie.", {
					status: 402,
					headers: {
						"Access-Control-Allow-Origin": "*"
					}
				});
			} else {
				return new Response("Verified user.", {
					status: 200,
					headers: {
						"Access-Control-Allow-Origin": "*"
					}
				});
			}
		} else {
			initUser()
		}

		// Create player_progress
		// 	const newplayer = await env.devDB.prepare(`
		// 	SELECT 1 FROM player_progress
		// 	WHERE player_id = (SELECT id FROM players WHERE uuid = ?)
		// `).bind(uuid).exists();

		//
		// Step 2: Find player ID
		// let player = await env.devDB
		// 	.prepare("SELECT id, name FROM players WHERE uuid = ?")
		// 	.bind(userUuid)
		// 	.first();
		//
		// // Retrieve the newly inserted player's ID
		// player = await env.devDB
		// 	.prepare("SELECT id, name FROM players WHERE uuid = ?")
		// 	.bind(userUuid)
		// 	.first();
		//
		// if (!player) {
		// 	return new Response("Failed to retrieve player ID after insertion", { status: 500 });
		// }


		// 🎮 Start game
		if (pathname === "/api/game/start") {
			// Try to find a skin the player hasn't started yet
			const userUuid = await verifyToken(userToken);
			// Invalid token
			if (!userUuid) {
				return new Response("Unverifiable user ID. Delete cookie.", {
					status: 402,
					headers: {
						"Access-Control-Allow-Origin": "*"
					}
				});
			}

			const skin = await nextUnprogressedSkin(userUuid)
			if (!skin) {
				return new Response("No unprogressed skins found!", {
					status: 402,
					headers: {
						"Access-Control-Allow-Origin": "*"
					}
				});
			}

			return new Response(JSON.stringify({ uuid: skin.uuid }), {
				status: 200,
				headers: {
					"Content-Type": "application/json",
					"Access-Control-Allow-Origin": "*"
				}
			});
		}



		// 🖼 Get image for specific skin/stage
		if (pathname === "/api/image" && request.method === "GET") {
			const url = new URL(request.url);
			const skinUuid = url.searchParams.get("skinUuid");

			if (!skinUuid) {
				return new Response("Missing skin UUID", { status: 400 });
			}

			//FIX: Player progress does not exist yet. Hence no current stage found.
			const image = await env.devDB.prepare(`
				SELECT image_path FROM skin_images
				WHERE skin_id = (SELECT id FROM skins WHERE uuid = ?)
				AND stage = (
					SELECT current_stage
					FROM player_progress
					WHERE player_id = (SELECT id FROM players WHERE uuid = ?)
					AND skin_id = (SE/LECT id FROM skins WHERE uuid = ?)
					ORDER BY current_stage DESC LIMIT 1
				)
			`).bind(skinUuid, userUuid, skinUuid).first();

			if (!image) return new Response("Image for player not found", { status: 404 });

			const file = await env.IMAGES_BUCKET.get(image.image_path);
			if (!file) return new Response("Image file not in R2", { status: 404 });

			return new Response(file.body, {
				headers: {
					"Content-Type": "image/jpeg",
					"Access-Control-Allow-Origin": "*"
				}
			});

		}

		// 🎯 Guess
		if (pathname === "/api/guess" && request.method === "GET") {
			const url = new URL(request.url);
			const skinUuid = url.searchParams.get("skinUuid");
			const guess = url.searchParams.get("guess");

			if (!skinUuid || !guess) {
				return new Response("Missing parameters", { status: 400 });
			}

			// Step 1: Fetch skin name
			const skin = await env.devDB
				.prepare("SELECT id, name FROM skins WHERE uuid = ?")
				.bind(skinUuid)
				.first();

			if (!skin) {
				return new Response("Skin not found", { status: 404 });
			}
			//TODO: fuzzy
			const correct = skin.name.toLowerCase() === guess.toLowerCase();



			// Step 3: Fetch current stage
			const progress = await env.devDB
				.prepare("SELECT current_stage FROM player_progress WHERE player_id = ? AND skin_id = ?")
				.bind(player.id, skin.id)
				.first();

			const stage = progress?.current_stage ?? 1;

			// Step 4: Upsert player progress
			await env.devDB.prepare(`
				INSERT INTO player_progress (player_id, skin_id, current_stage, solved)
				VALUES (?, ?, ?, ?)
				ON CONFLICT(player_id, skin_id) DO UPDATE SET
					current_stage = excluded.current_stage,
					solved = excluded.solved
			`).bind(
				player.id,
				skin.id,
				correct ? stage : Math.min(stage + 1, 5),
				correct
			).run();

			return new Response(JSON.stringify({ stage, correct }), {
				headers: {
					"Content-Type": "application/json",
					"Access-Control-Allow-Origin": "*"
				}
			});
		}



		// 🎮 New user: Initialize player and set cookie
		async function initUser() {
			const uuid = crypto.randomUUID();
			const token = await generateUserToken(uuid);

			await insertPlayer(uuid);
			await insertPlayerProgress(uuid);

			return new Response("New user created, reponding with cookie.", {
				headers: {
					"Set-Cookie": `user=${token}; Path=/; HttpOnly`,
					"Access-Control-Allow-Origin": "*"
				}
			});
		}

		async function insertPlayer(uuid: string) {
			try {
				await env.devDB.prepare(`
					INSERT INTO players(uuid) VALUES(?)
				`).bind(uuid).run();
				// return new Response("Player created", { status: 201 });
				console.log("Player created");
			} catch (err) {
				console.error("Error inserting player:", err);
				console.error("Player already exists", { status: 409 }); // 409 Conflict
			}
		}

		async function insertPlayerProgress(uuid: string) {
			await env.devDB.prepare(`
					INSERT INTO player_progress (player_id, skin_id, current_stage, solved)
					VALUES(
						?,
						(SELECT FROM skins ORDER BY id ASC LIMIT 1),
						1,
						false)
				`).bind(uuid).run();
		}

		async function nextUnprogressedSkin(userUuid: string) {
			return await env.devDB.prepare(`
				SELECT id, uuid, name FROM skins
				WHERE NOT EXISTS (
					SELECT 1 FROM player_progress
					WHERE player_id = (SELECT id FROM players WHERE uuid = ?)
					AND skin_id = skins.id
				)
				ORDER BY created_at ASC
				LIMIT 1
			`).bind(userUuid).first();
		}

		async function verifyToken(token: string) {
			if (typeof token !== "string") {
				return null;
			}
			const [uuid, hash] = token.split(".");
			if (!uuid || !hash) {
				return null;
			}
			const expected = await sha256(uuid + ":" + SECRET);
			return expected === hash ? uuid : null;
		}

		async function generateUserToken(uuid: string) {
			const hash = await sha256(uuid + ":" + SECRET);
			return `${uuid}.${hash}`;
		}

		function parseCookies(header: string | null) {
			return Object.fromEntries((header || "").split(";").map(part => part.trim().split("=")));
		}

		async function sha256(msg: string) {
			const data = new TextEncoder().encode(msg);
			const digest = await crypto.subtle.digest("SHA-256", data);
			return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
		}

		return new Response("Not found", { status: 404 });
	}
};

