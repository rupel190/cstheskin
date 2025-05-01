import { R2Uploader } from "./R2Uploader";
import { D1Uploader } from "./D1Uploader";
import { readFileSync } from "fs";
import { readdir } from "fs/promises";
import { join, extname, basename } from "path";


async function uploadImages(r2: R2Uploader, inputPath: string) {
  const files = await readdir(inputPath);
  for (const file of files) {
    if (!file.match(/\.(png|jpg|jpeg)$/i)) continue;
    const filePath = join(inputPath, file);
    const buffer = readFileSync(filePath);

    const key = `skins/${file}`;
    try {
      await r2.uploadFile(key, buffer);
    } catch (err) {
      console.error(`Failed to upload ${file}:`, err);
    }
  }
}

async function uploadMetadata(d1: D1Uploader, json: string) {
  if (!json.endsWith(".json")) {
    throw new Error("Invalid metadata file.");
  }
  await d1.uploadToDB(json);
}

async function main() {
  const r2 = new R2Uploader();
  const d1 = new D1Uploader();

  const inputPath = "./external/";
  const skinsJson = "./external/skins.json";

  await uploadImages(r2, inputPath);
  await uploadMetadata(d1, skinsJson);

  console.log("🎉 Upload completed.");
}

main().catch(console.error);


