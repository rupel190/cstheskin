import { R2Uploader } from "./R2Uploader";
import { D1Uploader } from "./D1Uploader";
import { readFileSync } from "fs";
import { readdir, stat } from "fs/promises";
import { join, relative, extname, basename } from "path";

async function walkDir(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const res = join(dir, entry.name);
      return entry.isDirectory() ? walkDir(res) : res;
    })
  );
  return files.flat();
}

async function uploadImages(r2: R2Uploader, inputPath: string) {
  const allFiles = await walkDir(inputPath);

  for (const filePath of allFiles) {
    if (!filePath.match(/\.(png|jpg|jpeg)$/i)) continue;

    const relPath = relative(inputPath, filePath);
    const key = `${relPath.replace(/\\/g, "/")}`;
    console.log(`Uploading ${relPath} as ${key} ...`);

    try {
      const buffer = readFileSync(filePath);
      await r2.uploadFile(key, buffer);
    } catch (err) {
      console.error(`Failed to upload ${filePath}:`, err);
    }
  }
}

// TODO: Currently only skin name + uuid
async function uploadMetadata(d1: D1Uploader, json: string, targetPath: string) {
  console.log("Uploading metadata");
  if (!json.endsWith(".json")) {
    throw new Error("Invalid metadata file.");
  }
  await d1.uploadToDB(json, targetPath);
}

async function main() {
  const r2 = new R2Uploader();
  const d1 = new D1Uploader();

  const inputPath = "./external/images/";
  const skinsJson = "./external/skins.json";
  const skinsTarget = "skins/";

  // await uploadImages(r2, inputPath);
  await uploadMetadata(d1, skinsJson, skinsTarget);

  console.log("🎉 Upload completed.");
}

main().catch(console.error);


