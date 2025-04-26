import sharp, { Metadata } from 'sharp';
import fs from 'fs/promises';
import path, { delimiter } from 'path';

type CropBox = { left: number; top: number; width: number; height: number };
type SkinCropData = {
  [skinName: string]: CropBox[];
};
const cropData: SkinCropData = {
  "AK-47": [
    { left: 0, top: 50, width: 150, height: 150 },
    { left: 150, top: 50, width: 150, height: 150 },
    { left: 270, top: 160, width: 150, height: 150 },
    { left: 360, top: 120, width: 150, height: 150 },
    { left: 0, top: 0, width: 512, height: 384 }, // full
  ],
};


function getSkinFromFileName(filename: string): string {
  const base = path.basename(filename); // MP7_|_Abyssal_Apparition.png
  const skin = base.split("|")[0].trim();
  return skin.replace(/_/g, " ").trim();
}

async function cropImage(inputPath: string, outputPath: string, cropTemplate: CropBox) {
  const metadata = await sharp(inputPath).metadata();
  console.log(`🖼 ${inputPath} - ${metadata.width}x${metadata.height}`);
  console.log(inputPath, cropTemplate, outputPath)
  await sharp(inputPath)
    .extract(cropTemplate)
    .toFile(outputPath);
}

async function multiCrop(filePath: string, outputDir: string, cropboxes: CropBox[]) {
  for (let i = 0; i < cropboxes?.length; i++) {
    const cropbox = cropboxes[i];
    const outputFileName = `${path.basename(filePath, path.extname(filePath))}_stage${i + 1}.jpg`;
    const outPath = path.join(outputDir, outputFileName);
    await cropImage(filePath, outPath, cropbox);
  }
}

(async () => {
  const imageDir = '../webscraper/images/';
  const outputDir = './cropped';
  await fs.mkdir(outputDir, { recursive: true }); // ensure output dir exists
  const files = await fs.readdir(imageDir);
  const fullPaths = files.map(file => path.join(imageDir, file));

  try {
    for (const filePath of fullPaths) {
      const skin = getSkinFromFileName(filePath);
      console.log("\nFetched skin: ", skin);

      const meta = await sharp(filePath).metadata();
      await multiCrop(filePath, outputDir, cropData[skin]);
    }
  } catch (err) {
    console.error("💥 Error:", err);
  }
})();


