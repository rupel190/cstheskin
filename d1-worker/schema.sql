DROP TABLE IF EXISTS skins;
CREATE TABLE IF NOT EXISTS skins (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	uuid TEXT UNIQUE NOT NULL,
	name TEXT NOT NULL,
	encrypted_name TEXT NOT NULL
	);

DROP TABLE IF EXISTS skin_images;
CREATE TABLE IF NOT EXISTS skin_images (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	skin_id INTEGER NOT NULL REFERENCES skins(id),
	stage INTEGER NOT NULL,
	image_path TEXT NOT NULL
	);

DROP TABLE IF EXISTS player;
CREATE TABLE IF NOT EXISTS player (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	uuid TEXT UNIQUE NOT NULL
);

DROP TABLE IF EXISTS player_progress;
CREATE TABLE IF NOT EXISTS player_progress (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	player_id INTEGER NOT NULL REFERENCES player(id),
	skin_id INTEGER NOT NULL REFERENCES skins(id),
	current_guess INTEGER DEFAULT 1, -- 1 to 5 getting progressively easier
	solved BOOLEAN DEFAULT FALSE,
	UNIQUE (player_id, skin_id)
);

insert into skins  (uuid, name, encrypted_name) values
	('furzuuid', 'redlangos', 'secretredlangos');

-- INSERT INTO Customers (CustomerID, CompanyName, ContactName)
-- VALUES (1, 'Alfreds Futterkiste', 'Maria Anders'), (4, 'Around the Horn', 'Thomas Hardy'), (11, 'Bs Beverages', 'Victoria Ashworth'), (13, 'Bs Beverages', 'Random Name');
