import sharp, { Metadata } from 'sharp';
import fs from 'fs/promises';
import path, { delimiter } from 'path';

type CropBox = { left: number; top: number; width: number; height: number };
type SkinCropData = {
  [skinName: string]: CropBox[];
};
// const cropData: SkinCropData = {
//   "AK-47": [
//     { left: 0, top: 50, width: 150, height: 150 },
//     { left: 150, top: 50, width: 150, height: 150 },
//     { left: 270, top: 160, width: 150, height: 150 },
//     { left: 360, top: 120, width: 150, height: 150 },
//     { left: 0, top: 0, width: 512, height: 384 }, // full
//   ],
// };
//

const cropData: SkinCropData = {
  "AK-47": [
    { left: 320, top: 40, width: 150, height: 150 }, // hard (small detail)
    { left: 250, top: 120, width: 150, height: 150 }, // bit bigger
    { left: 100, top: 80, width: 150, height: 150 }, // main part
    { left: 180, top: 200, width: 150, height: 150 }, // large part
    { left: 0, top: 0, width: 512, height: 384 }, // full
  ],
  "Dual Berettas": [
    { left: 200, top: 50, width: 150, height: 150 },
    { left: 120, top: 60, width: 150, height: 150 },
    { left: 180, top: 140, width: 150, height: 150 },
    { left: 250, top: 200, width: 150, height: 150 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "FAMAS": [
    { left: 330, top: 40, width: 150, height: 150 },
    { left: 220, top: 90, width: 150, height: 150 },
    { left: 150, top: 150, width: 150, height: 150 },
    { left: 80, top: 200, width: 150, height: 150 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "Five-SeveN": [
    { left: 300, top: 50, width: 150, height: 150 },
    { left: 200, top: 80, width: 150, height: 150 },
    { left: 100, top: 140, width: 150, height: 150 },
    { left: 150, top: 220, width: 150, height: 150 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "G3SG1": [
    { left: 350, top: 30, width: 150, height: 150 },
    { left: 280, top: 90, width: 150, height: 150 },
    { left: 200, top: 130, width: 150, height: 150 },
    { left: 120, top: 190, width: 150, height: 150 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "M4A1-S": [
    { left: 340, top: 50, width: 150, height: 150 },
    { left: 250, top: 100, width: 150, height: 150 },
    { left: 180, top: 160, width: 150, height: 150 },
    { left: 100, top: 200, width: 150, height: 150 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "MAC-10": [
    { left: 280, top: 40, width: 150, height: 150 },
    { left: 210, top: 100, width: 150, height: 150 },
    { left: 140, top: 160, width: 150, height: 150 },
    { left: 100, top: 220, width: 150, height: 150 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "MAG-7": [
    { left: 360, top: 30, width: 150, height: 150 },
    { left: 260, top: 80, width: 150, height: 150 },
    { left: 190, top: 140, width: 150, height: 150 },
    { left: 120, top: 200, width: 150, height: 150 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "MP5-SD": [
    { left: 300, top: 40, width: 150, height: 150 },
    { left: 230, top: 90, width: 150, height: 150 },
    { left: 160, top: 140, width: 150, height: 150 },
    { left: 90, top: 200, width: 150, height: 150 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "MP7": [
    { left: 320, top: 30, width: 150, height: 150 },
    { left: 240, top: 80, width: 150, height: 150 },
    { left: 170, top: 140, width: 150, height: 150 },
    { left: 100, top: 200, width: 150, height: 150 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "MP9": [
    { left: 330, top: 30, width: 150, height: 150 },
    { left: 250, top: 90, width: 150, height: 150 },
    { left: 170, top: 140, width: 150, height: 150 },
    { left: 100, top: 200, width: 150, height: 150 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "P2000": [
    { left: 340, top: 30, width: 150, height: 150 },
    { left: 260, top: 80, width: 150, height: 150 },
    { left: 190, top: 140, width: 150, height: 150 },
    { left: 120, top: 200, width: 150, height: 150 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "PP-Bizon": [
    { left: 310, top: 50, width: 150, height: 150 },
    { left: 230, top: 90, width: 150, height: 150 },
    { left: 150, top: 150, width: 150, height: 150 },
    { left: 80, top: 200, width: 150, height: 150 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "Sawed-Off": [
    { left: 320, top: 30, width: 150, height: 150 },
    { left: 250, top: 80, width: 150, height: 150 },
    { left: 170, top: 140, width: 150, height: 150 },
    { left: 90, top: 200, width: 150, height: 150 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "SCAR-20": [
    { left: 300, top: 50, width: 150, height: 150 },
    { left: 230, top: 100, width: 150, height: 150 },
    { left: 160, top: 150, width: 150, height: 150 },
    { left: 90, top: 200, width: 150, height: 150 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "USP-S": [
    { left: 350, top: 40, width: 150, height: 150 },
    { left: 270, top: 90, width: 150, height: 150 },
    { left: 190, top: 140, width: 150, height: 150 },
    { left: 110, top: 200, width: 150, height: 150 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "XM1014": [
    { left: 320, top: 50, width: 150, height: 150 },
    { left: 240, top: 100, width: 150, height: 150 },
    { left: 170, top: 150, width: 150, height: 150 },
    { left: 100, top: 200, width: 150, height: 150 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "AWP": [
    { left: 370, top: 30, width: 150, height: 150 },
    { left: 290, top: 80, width: 150, height: 150 },
    { left: 210, top: 140, width: 150, height: 150 },
    { left: 130, top: 200, width: 150, height: 150 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "P250": [
    { left: 340, top: 30, width: 150, height: 150 },
    { left: 260, top: 90, width: 150, height: 150 },
    { left: 180, top: 140, width: 150, height: 150 },
    { left: 100, top: 200, width: 150, height: 150 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "SSG 08": [
    { left: 360, top: 30, width: 150, height: 150 },
    { left: 280, top: 80, width: 150, height: 150 },
    { left: 200, top: 140, width: 150, height: 150 },
    { left: 120, top: 200, width: 150, height: 150 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "CZ75-Auto": [
    { left: 0, top: 40, width: 150, height: 150 },
    { left: 150, top: 50, width: 150, height: 150 },
    { left: 300, top: 60, width: 150, height: 150 },
    { left: 200, top: 200, width: 150, height: 150 },
    { left: 0, top: 0, width: 512, height: 384 }, // full
  ],
  "Desert Eagle": [
    { left: 50, top: 40, width: 150, height: 150 },
    { left: 200, top: 40, width: 150, height: 150 },
    { left: 330, top: 80, width: 150, height: 150 },
    { left: 100, top: 220, width: 150, height: 150 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "Glock-18": [
    { left: 20, top: 50, width: 150, height: 150 },
    { left: 180, top: 40, width: 150, height: 150 },
    { left: 320, top: 70, width: 150, height: 150 },
    { left: 150, top: 210, width: 150, height: 150 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "R8 Revolver": [
    { left: 0, top: 60, width: 150, height: 150 },
    { left: 150, top: 70, width: 150, height: 150 },
    { left: 300, top: 80, width: 150, height: 150 },
    { left: 120, top: 230, width: 150, height: 150 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "Tec-9": [
    { left: 30, top: 40, width: 150, height: 150 },
    { left: 170, top: 40, width: 150, height: 150 },
    { left: 310, top: 70, width: 150, height: 150 },
    { left: 160, top: 210, width: 150, height: 150 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "UMP-45": [
    { left: 40, top: 30, width: 150, height: 150 },
    { left: 190, top: 40, width: 150, height: 150 },
    { left: 330, top: 80, width: 150, height: 150 },
    { left: 150, top: 210, width: 150, height: 150 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "P90": [
    { left: 30, top: 30, width: 150, height: 150 },
    { left: 200, top: 40, width: 150, height: 150 },
    { left: 350, top: 70, width: 150, height: 150 },
    { left: 120, top: 240, width: 150, height: 150 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "Galil AR": [
    { left: 20, top: 50, width: 150, height: 150 },
    { left: 180, top: 60, width: 150, height: 150 },
    { left: 330, top: 70, width: 150, height: 150 },
    { left: 150, top: 200, width: 150, height: 150 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "M4A4": [
    { left: 40, top: 40, width: 150, height: 150 },
    { left: 190, top: 50, width: 150, height: 150 },
    { left: 340, top: 80, width: 150, height: 150 },
    { left: 160, top: 210, width: 150, height: 150 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "SG 553": [
    { left: 30, top: 40, width: 150, height: 150 },
    { left: 180, top: 50, width: 150, height: 150 },
    { left: 330, top: 70, width: 150, height: 150 },
    { left: 140, top: 220, width: 150, height: 150 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "M249": [
    { left: 20, top: 30, width: 150, height: 150 },
    { left: 180, top: 30, width: 150, height: 150 },
    { left: 330, top: 50, width: 150, height: 150 },
    { left: 150, top: 210, width: 150, height: 150 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "Negev": [
    { left: 10, top: 40, width: 150, height: 150 },
    { left: 170, top: 50, width: 150, height: 150 },
    { left: 320, top: 70, width: 150, height: 150 },
    { left: 140, top: 220, width: 150, height: 150 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "Nova": [
    { left: 30, top: 50, width: 150, height: 150 },
    { left: 180, top: 50, width: 150, height: 150 },
    { left: 320, top: 70, width: 150, height: 150 },
    { left: 140, top: 230, width: 150, height: 150 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
};


function getSkinFromFileName(filename: string): string {
  const base = path.basename(filename); // images/MP7 | Abyssal Apparition.png
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
    const outputFileName = `${path.basename(filePath, path.extname(filePath))}_stage${i + 1}.png`;
    const outPath = path.join(outputDir, outputFileName);
    await cropImage(filePath, outPath, cropbox);
  }
}

(async () => {

  //TODO: Get correct output dir from json to crop

  const imageDir = '../webscraper/images/skins';
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


