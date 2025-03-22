// src/index.ts
var index_default = {
	async fetch(request, env) {
		const url = new URL(request.url);
		const { pathname } = url
		const { searchParams } = url

		// (Debug) Get skin by name
		if (pathname === "/api/skins") {
			try {
				let name = searchParams.get("name");
				const query = env.devDB.prepare("SELECT * FROM skins WHERE name = ?").bind(name);
				const { results } = await query.all();
				// console.log("Query results:", results);
				return Response.json(results);
			} catch (error) {
				console.error("Error executing query:", error);
				return new Response("Internal Server Error", { status: 500 });
			}
		}

		// Get skin by uuid
		if (pathname === "/api/skins") {
			try {
				const uuid = searchParams.get("uuid");
				const query = env.devDB.prepare("SELECT * FROM skins WHERE uuid = ?").bind(uuid);
				const { results } = await query.all();
				return Response.json(results);
			} catch (error) {
				console.error("Error executing query:", error);
				return new Response("Internal Server Error", { status: 500 });
			}
		}

		// Get all skin uuids
		if (url.pathname === "/api/skins/uuids") {
			// Fetch all skin UUIDs
			const { results } = await env.devDB.prepare(
				"SELECT uuid FROM skins ORDER BY created_at ASC"
			).all();
			return Response.json(results);
		}



		// (DEBUG) Get player by uuid
		if (url.pathname === "/api/player") {
			try {
				const uuid = searchParams.get("uuid");
				const { results } = await env.devDB.prepare(
					"SELECT * FROM players WHERE uuid = ?")
					.bind(uuid)
					.all();
				return Response.json(results);

			} catch (error) {
				console.error("Error getting player by uuid:", error);
				return new Response("Internal Server Error", { status: 500 });
			}
		}

		// Get player progress per uuid
		if (request.method === "GET" && url.pathname === "/api/progress") {
			try {
				const uuid = searchParams.get("uuid");
				const { results } = await env.devDB.prepare(
					"SELECT skin, current_stage, solved FROM player_progress WHERE player_id = (SELECT id FROM players WHERE uuid = ?)")
					.bind(uuid)
					.all();
				return Response.json(results);

			} catch (error) {
				console.error("Error getting player progress by uuid:", error);
				return new Response("Internal Server Error", { status: 500 });
			}
		}

		// Get image for skin and stage
		if (request.method === "GET" && url.pathname === "/api/image/") {
			try {
				const { uuid, current_stage } = await request.json();
				const { results } = await env.devDB.prepare(
					"SELECT image_path FROM skin_images WHERE skin_id = (SELECT id FROM skins WHERE uuid = ?) AND stage = ?")
					.bind(uuid, current_stage)
					.all();
				return Response.json(results);

			} catch (error) {
				console.error("Error getting image by skin and stage:", error);
				return new Response("Internal Server Error", { status: 500 });
			}
		}

		// Insert new image data for skin
		/*
		 * Example json input
			{
				"uuid": "a4c3e8aa-91f7-4e44-8f57-1342cbf2013d",
				"images": [
					{ "stage": 1, "image_path": "a4c3e8aa_stage1.jpg" },
					{ "stage": 2, "image_path": "a4c3e8aa_stage2.jpg" },
					{ "stage": 3, "image_path": "a4c3e8aa_stage3.jpg" },
					{ "stage": 4, "image_path": "a4c3e8aa_stage4.jpg" },
					{ "stage": 5, "image_path": "a4c3e8aa_stage5.jpg" }
				]
			}
			* */
		if (request.method === "POST" && url.pathname === "/api/image/") {
			try {
				const { uuid, images } = await request.json();

				if (!uuid || !Array.isArray(images)) {
					return new Response("Invalid payload", { status: 400 });
				}

				const skin = await env.devDB
					.prepare("SELECT id FROM skins WHERE uuid = ?")
					.bind(uuid)
					.first();

				if (!skin) {
					return new Response("Skin not found", { status: 404 });
				}

				const stmt = env.devDB.prepare(`
					INSERT INTO skin_images (skin_id, stage, image_path)
					VALUES (?, ?, ?)
					ON CONFLICT(skin_id, stage)
					DO UPDATE SET image_path = excluded.image_path
				`);

				for (const { stage, image_path } of images) {
					await stmt.bind(skin.id, stage, image_path).run();
				}

				return Response.json({ message: "Images upserted successfully" });
			} catch (error) {
				console.error("Error inserting/updating skin images:", error);
				return new Response("Internal Server Error", { status: 500 });
			}
		}

		// Insert new skin
		if (request.method === "GET" && url.pathname === "/api/skins") {
			try {
				const name = searchParams.get("name")?.trim();
				const encryptedName = searchParams.get("encrypted_name")?.trim();

				if (!name || !encryptedName) {
					return new Response("Missing name or encrypted_name", { status: 400 });
				}

				const skinUuid = crypto.randomUUID();

				await env.devDB
					.prepare(`
						INSERT INTO skins (uuid, name, encrypted_name)
						VALUES (?, ?, ?)
						ON CONFLICT(uuid)
						DO UPDATE SET name, encryptedName
					`)
					.bind(skinUuid, name, encryptedName)
					.run();
				return Response.json({ message: "Skin created, reference images using", uuid: skinUuid });
			} catch (error) {
				console.error("Error inserting skin:", error);
				return new Response("Internal Server Error", { status: 500 });
			}
		}

		// Insert new player
		if (request.method === "GET" && url.pathname === "/api/player/new") {
			try {
				const name = searchParams.get("name");
				const playerUuid = crypto.randomUUID(); // Generate unique UUID

				if (!name) {
					env.devDB
						.prepare("INSERT INTO players (uuid) VALUES (?)")
						.bind(playerUuid)
						.run() // Use .run() for INSERT
				} else {
					env.devDB
						.prepare("INSERT INTO players (uuid, name) VALUES (?, ?)")
						.bind(playerUuid, name)
						.run()
				}
				return Response.json({ message: "Player created", uuid: playerUuid });
			} catch (error) {
				console.error("Error inserting player:", error);
				return new Response("Internal Server Error", { status: 500 });
			}
		}


		// 💷 Guess 🎰 the 🎰 skin 💷
		if (url.pathname === "/api/guess/") {
			try {
				const { uuid, guess_input } = await request.json();

				const { results } = await env.devDB.prepare(
					"SELECT count(*) FROM skins WHERE uuid = ? AND name = ?")
					.bind(uuid, guess_input)
					.first();
				return Response.json(results);

			} catch (error) {
				console.error("Error getting image by skin and stage:", error);
				return new Response("Internal Server Error", { status: 500 });
			}
		}

		// Save player progress
		if (request.method === "POST" && url.pathname === "/api/progress") {
			try {
				const { player_uuid, skin_uuid, current_stage, solved } = await request.json();

				env.devDB
					.prepare(`
							INSERT INTO player_progress (player_id, skin_id, current_stage, solved)
							VALUES (
									(SELECT id FROM players WHERE uuid = ?),
									(SELECT id FROM skins WHERE uuid = ?),
									?, ?
							)
							ON CONFLICT(player_id, skin_id)
							DO UPDATE SET
									current_stage = excluded.current_stage,
									solved = excluded.correct`)
					.bind(player_uuid, skin_uuid, current_stage, solved)
					.run() // Use .run() for INSERT
				return Response.json({ message: "Player progress updated" });
			} catch (error) {
				console.error("Error inserting player:", error);
				return new Response("Internal Server Error", { status: 500 });
			}
		}


		if (pathname === "/") {
			return new Response("Worker is running! Try hitting a real /api/ endpoint.");
		}

		if (pathname === "/favicon.ico") {
			return new Response(null, { status: 204 });
		}
		return new Response(
			JSON.stringify({ error: "Endpoint not found", path: url.pathname }),
			{ status: 404, headers: { "Content-Type": "application/json" } }
		);

	}
};
export {
	index_default as default
};
//# sourceMappingURL=index.js.map
