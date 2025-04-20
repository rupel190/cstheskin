const SECRET = "super_secret_server_side_salt"; // TODO: move to env in prod!

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		const { pathname } = url;

		const cookies = parseCookies(request.headers.get("cookie"));
		const userToken = cookies["user"];
		const userUuid = await verifyToken(userToken);

		// 🎮 Initialize player and set cookie
		if (!userUuid) {
			const uuid = crypto.randomUUID();
			const token = await generateUserToken(uuid);

			return new Response("Invalid or missing user ID. New user initialized.", {
				headers: {
					"Set-Cookie": `user=${token}; Path=/; HttpOnly`,
					"Access-Control-Allow-Origin": "*"
				}
			});
		}

		// 🎮 Start game
		if (pathname === "/api/game/start") {
			// Try to find a skin the player hasn't started yet
			const skinUuid = await env.devDB.prepare(`
				SELECT uuid FROM skins
				WHERE NOT EXISTS (
					SELECT 1 FROM player_progress
					WHERE player_id = (SELECT id FROM players WHERE uuid = ?)
					AND skin_id = skins.id
				)
				ORDER BY id ASC
				LIMIT 1
			`).bind(userUuid).first();

			if (!skinUuid) {
				return new Response("You finished all available skins!", {
					status: 200,
					headers: {
						"Access-Control-Allow-Origin": "*"
					}
				});
			}
			return new Response(skinUuid, {
				status: 200,
				headers: {
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

			const image = await env.devDB.prepare(`
				SELECT image_path FROM skin_images
				WHERE skin_id = (SELECT id FROM skins WHERE uuid = ?)
				AND stage = (
					SELECT current_stage
					FROM player_progress
					WHERE player_id = (SELECT id FROM players WHERE uuid = ?)
					AND skin_id = (SELECT id FROM skins WHERE uuid = ?)
					ORDER BY current_stage DESC LIMIT 1
				)
			`).bind(skinUuid, userUuid, skinUuid).first();

			if (!image) return new Response("Image not found", { status: 404 });

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

			// Step 2: Find player ID
			let player = await env.devDB
				.prepare("SELECT id, name FROM players WHERE uuid = ?")
				.bind(userUuid)
				.first();

			if (!player) {
				try {
					await env.devDB.prepare(`
						INSERT INTO players(uuid) VALUES(?)
					`).bind(userUuid).run();
					return new Response("Player created", { status: 201 });
				} catch (err) {
					console.error("Error inserting player:", err);
					return new Response("Player already exists", { status: 409 }); // 409 Conflict
				}
			}
			// Retrieve the newly inserted player's ID
			player = await env.devDB
				.prepare("SELECT id, name FROM players WHERE uuid = ?")
				.bind(userUuid)
				.first();

			if (!player) {
				return new Response("Failed to retrieve player ID after insertion", { status: 500 });
			}

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



		async function verifyToken(token: string) {
			const [uuid, hash] = token.split(".");
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

		async function verifyCookie(request: Request) {
			// const cookies = parseCookies(request.headers.get("cookie"));
			const encoded = cookies["progress"];
			const hash = cookies["progress_hash"];
			if (!encoded || !hash) return null;

			const expected = await sha256(`${encoded}:${SECRET}`);
			if (expected !== hash) return null;

			const decoded = JSON.parse(atob(encoded));
			return decoded; // { uuid, stage, solved }
		}

		return new Response("Not found", { status: 404 });
	}
};

