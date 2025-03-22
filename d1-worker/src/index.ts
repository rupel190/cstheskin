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

		// (DEBUG) Get player by uuid
		if (url.pathname === "/api/player") {
			try {
				const uuid = searchParams.get("uuid");
				const { results } = await env.devDB.prepare(
					"SELECT * FROM player WHERE uuid = ?")
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
		if (url.pathname === "/api/image/") {
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

	}
};
export {
	index_default as default
};
//# sourceMappingURL=index.js.map
