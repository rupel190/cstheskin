DROP TABLE IF EXISTS player_progress;
DROP TABLE IF EXISTS skin_images;
DROP TABLE IF EXISTS players;
DROP TABLE IF EXISTS skins;

CREATE TABLE IF NOT EXISTS skins (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	uuid TEXT UNIQUE NOT NULL,
	name TEXT NOT NULL,
	encrypted_name TEXT NOT NULL,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS skin_images (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	skin_id INTEGER NOT NULL REFERENCES skins(id),
	stage INTEGER NOT NULL,
	image_path TEXT NOT NULL,
	UNIQUE (skin_id, stage)
);

CREATE TABLE IF NOT EXISTS players (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	uuid TEXT UNIQUE NOT NULL,
	name TEXT
);

CREATE TABLE IF NOT EXISTS player_progress (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	player_id INTEGER NOT NULL REFERENCES players(id),
	skin_id INTEGER NOT NULL REFERENCES skins(id),
	current_stage INTEGER DEFAULT 1,
	solved BOOLEAN DEFAULT FALSE,
	UNIQUE (player_id, skin_id)
);

-- Insert skins from R2 data with proper crypto.randomUUID() generated UUIDs
INSERT INTO skins (uuid, name, encrypted_name) VALUES
('add276e4-f0bf-4901-8b50-31da2fd28813', 'AK-47 | Nightwish', 'AK-47 | Nightwish'),
('023f3717-c9b5-4bdb-84eb-87809b436447', 'Dual Berettas | Melondrama', 'Dual Berettas | Melondrama'),
('9acc1785-ae83-4e46-bd37-d66d7f001b12', 'FAMAS | Rapid Eye Movement', 'FAMAS | Rapid Eye Movement'),
('7250f5fe-65e7-46ee-b537-344740a8b259', 'Five-SeveN | Scrawl', 'Five-SeveN | Scrawl'),
('55877bf3-49da-4472-adf7-1e83d5e99f1b', 'G3SG1 | Dream Glade', 'G3SG1 | Dream Glade'),
('301d7f50-c279-4477-a7a3-3186cfa10265', 'M4A1-S | Night Terror', 'M4A1-S | Night Terror'),
('ebc1dad1-2a15-4fa1-82cf-b01b36e5fca2', 'MAC-10 | Ensnared', 'MAC-10 | Ensnared'),
('6de42bd7-7071-4764-b79b-9074b0435bf8', 'MAG-7 | Foresight', 'MAG-7 | Foresight'),
('7f9730ad-c6c8-4a73-b890-544b73f6a1ab', 'MP5-SD | Necro Jr.', 'MP5-SD | Necro Jr.'),
('07f58173-4920-49a2-9b0a-0dc42dade6a2', 'MP7 | Abyssal Apparition', 'MP7 | Abyssal Apparition');

-- Insert skin images for all stages with correct R2 paths
INSERT INTO skin_images (skin_id, stage, image_path) VALUES
-- AK-47 | Nightwish (skin_id: 1)
(1, 1, 'skins/AK-47_|_Nightwish_stage1.jpg'),
(1, 2, 'skins/AK-47_|_Nightwish_stage2.jpg'),
(1, 3, 'skins/AK-47_|_Nightwish_stage3.jpg'),
(1, 4, 'skins/AK-47_|_Nightwish_stage4.jpg'),
(1, 5, 'skins/AK-47_|_Nightwish_stage5.jpg'),
-- Dual Berettas | Melondrama (skin_id: 2)
(2, 1, 'skins/Dual_Berettas_|_Melondrama_stage1.jpg'),
(2, 2, 'skins/Dual_Berettas_|_Melondrama_stage2.jpg'),
(2, 3, 'skins/Dual_Berettas_|_Melondrama_stage3.jpg'),
(2, 4, 'skins/Dual_Berettas_|_Melondrama_stage4.jpg'),
(2, 5, 'skins/Dual_Berettas_|_Melondrama_stage5.jpg'),
-- FAMAS | Rapid Eye Movement (skin_id: 3)
(3, 1, 'skins/FAMAS_|_Rapid_Eye_Movement_stage1.jpg'),
(3, 2, 'skins/FAMAS_|_Rapid_Eye_Movement_stage2.jpg'),
(3, 3, 'skins/FAMAS_|_Rapid_Eye_Movement_stage3.jpg'),
(3, 4, 'skins/FAMAS_|_Rapid_Eye_Movement_stage4.jpg'),
(3, 5, 'skins/FAMAS_|_Rapid_Eye_Movement_stage5.jpg'),
-- Five-SeveN | Scrawl (skin_id: 4)
(4, 1, 'skins/Five-SeveN_|_Scrawl_stage1.jpg'),
(4, 2, 'skins/Five-SeveN_|_Scrawl_stage2.jpg'),
(4, 3, 'skins/Five-SeveN_|_Scrawl_stage3.jpg'),
(4, 4, 'skins/Five-SeveN_|_Scrawl_stage4.jpg'),
(4, 5, 'skins/Five-SeveN_|_Scrawl_stage5.jpg'),
-- G3SG1 | Dream Glade (skin_id: 5)
(5, 1, 'skins/G3SG1_|_Dream_Glade_stage1.jpg'),
(5, 2, 'skins/G3SG1_|_Dream_Glade_stage2.jpg'),
(5, 3, 'skins/G3SG1_|_Dream_Glade_stage3.jpg'),
(5, 4, 'skins/G3SG1_|_Dream_Glade_stage4.jpg'),
(5, 5, 'skins/G3SG1_|_Dream_Glade_stage5.jpg'),
-- M4A1-S | Night Terror (skin_id: 6)
(6, 1, 'skins/M4A1-S_|_Night_Terror_stage1.jpg'),
(6, 2, 'skins/M4A1-S_|_Night_Terror_stage2.jpg'),
(6, 3, 'skins/M4A1-S_|_Night_Terror_stage3.jpg'),
(6, 4, 'skins/M4A1-S_|_Night_Terror_stage4.jpg'),
(6, 5, 'skins/M4A1-S_|_Night_Terror_stage5.jpg'),
-- MAC-10 | Ensnared (skin_id: 7)
(7, 1, 'skins/MAC-10_|_Ensnared_stage1.jpg'),
(7, 2, 'skins/MAC-10_|_Ensnared_stage2.jpg'),
(7, 3, 'skins/MAC-10_|_Ensnared_stage3.jpg'),
(7, 4, 'skins/MAC-10_|_Ensnared_stage4.jpg'),
(7, 5, 'skins/MAC-10_|_Ensnared_stage5.jpg'),
-- MAG-7 | Foresight (skin_id: 8)
(8, 1, 'skins/MAG-7_|_Foresight_stage1.jpg'),
(8, 2, 'skins/MAG-7_|_Foresight_stage2.jpg'),
(8, 3, 'skins/MAG-7_|_Foresight_stage3.jpg'),
(8, 4, 'skins/MAG-7_|_Foresight_stage4.jpg'),
(8, 5, 'skins/MAG-7_|_Foresight_stage5.jpg'),
-- MP5-SD | Necro Jr. (skin_id: 9)
(9, 1, 'skins/MP5-SD_|_Necro_Jr._stage1.jpg'),
(9, 2, 'skins/MP5-SD_|_Necro_Jr._stage2.jpg'),
(9, 3, 'skins/MP5-SD_|_Necro_Jr._stage3.jpg'),
(9, 4, 'skins/MP5-SD_|_Necro_Jr._stage4.jpg'),
(9, 5, 'skins/MP5-SD_|_Necro_Jr._stage5.jpg'),
-- MP7 | Abyssal Apparition (skin_id: 10)
(10, 1, 'skins/MP7_|_Abyssal_Apparition_stage1.jpg'),
(10, 2, 'skins/MP7_|_Abyssal_Apparition_stage2.jpg'),
(10, 3, 'skins/MP7_|_Abyssal_Apparition_stage3.jpg'),
(10, 4, 'skins/MP7_|_Abyssal_Apparition_stage4.jpg'),
(10, 5, 'skins/MP7_|_Abyssal_Apparition_stage5.jpg');