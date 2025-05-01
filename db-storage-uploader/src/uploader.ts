import { R2Uploader } from "./R2Uploader";
import { readFileSync } from "fs";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

async function main() {
  const uploader = new R2Uploader();
  const inputPath = "./external/";
  const files = await readdir(inputPath);

  for (const file in files) {
    const filePath = join(inputPath, file);
    const fileBuffer = readFileSync(filePath);
    await uploader.uploadFile(`skins/${file}.png`, fileBuffer);
    console.log(`Uploaded: ${file}`);
  }
}

main().catch(console.error);

