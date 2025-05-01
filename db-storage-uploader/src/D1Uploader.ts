import "dotenv/config";
import fetch from "node-fetch";
import * as fs from "fs";

export class D1Uploader {
  private token = process.env.API_TOKEN!;
  private accountId = process.env.R2_ACCOUNT_ID!;
  private dbId = process.env.D1_DB_ID!;

  async uploadToDB(skinsJsonPath: string): Promise<void> {
    const jsonData = JSON.parse(fs.readFileSync(skinsJsonPath, "utf-8"));

    for (const e of jsonData) {
      const sql = `INSERT INTO skins (uuid, name) VALUES (?, ?)`;

      await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${this.dbId}/query`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          params: [e.uuid, e.name],
          sql
        })
      });
    }

  }
}

