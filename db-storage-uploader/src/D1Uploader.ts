import "dotenv/config";
import fetch from "node-fetch";
import * as fs from "fs";
import { randomUUID } from "crypto";
import { join, relative, extname, basename } from "path";
import path from 'path';

export class D1Uploader {
  private accountId = process.env.R2_ACCOUNT_ID!;
  private dbId = process.env.D1_DB_ID!;
  private d1Token = process.env.D1_TOKEN!;

  async execReq(requestBody: string) {
    return fetch(`https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${this.dbId}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.d1Token}`,
        "Content-Type": "application/json"
      },
      body: requestBody
    });
  }

  async uploadToDB(skinsJsonPath: string, prefixImagePath: string = ""): Promise<void> {
    const jsonData = JSON.parse(fs.readFileSync(skinsJsonPath, "utf-8"));

    for (const e of jsonData) {
      const uuid = crypto.randomUUID();
      let body = "";

      // Insert skin
      body = JSON.stringify({
        params: [uuid, e.name, e.rarity],
        sql: `INSERT INTO skins (uuid, name, encrypted_name) VALUES (?, ?, ?)`
      });
      const insertSkinRes = await this.execReq(body);
      console.log("Skin upload res: ", await insertSkinRes.json());

      // Fetch skin ID
      body = JSON.stringify({
        params: [uuid],
        sql: `SELECT id FROM skins WHERE uuid = ?`
      });
      const skin = await this.execReq(body);

      const skinData = await skin.json() as any;
      const skinId = skinData.result?.[0]?.results?.[0]?.id;
      console.log("\nSkin ID:", skinId);

      // Insert into skin_images
      for (let i = 1; i < 6; i++) {
        console.log("locaaaaaaaaaaaa", e.outPathSkin);
        const baseFilename = basename(e.outPathSkin, ".png"); // → Sawed-Off_|_Spirit_Board
        const finalFilename = `${baseFilename}_stage${i}.png`; // Sawed-Off_|_Spirit_Board_stage1.png
        console.log(finalFilename);

        body = JSON.stringify({
          params: [skinId, i, finalFilename],
          sql: `INSERT INTO skin_images (skin_id, stage, image_path) VALUES (?, ?, ?)`
        });
        const insertSkinImageRes = await this.execReq(body);
        console.log("Skin upload res: ", await insertSkinImageRes.json());
      }
    }
  }
}

