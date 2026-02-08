import sharp, { Metadata } from 'sharp';
import fs from 'fs/promises';
import path, { delimiter } from 'path';

type CropBox = { left: number; top: number; width: number; height: number };
type SkinCropData = {
  [skinName: string]: CropBox[];
};

const cropData: SkinCropData = {
  "AK-47": [
    { left: 56, top: 54, width: 125, height: 125 },
    { left: 416, top: 154, width: 96, height: 96 },
    { left: 269, top: 223, width: 111, height: 111 },
    { left: 279, top: 94, width: 132, height: 132 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "Dual Berettas": [
    { left: 201, top: 0, width: 138, height: 138 },
    { left: 89, top: 230, width: 89, height: 89 },
    { left: 171, top: 198, width: 182, height: 182 },
    { left: 315, top: 124, width: 168, height: 168 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "FAMAS": [
    { left: 11, top: 18, width: 170, height: 170 },
    { left: 352, top: 216, width: 116, height: 116 },
    { left: 388, top: 99, width: 124, height: 124 },
    { left: 240, top: 64, width: 138, height: 138 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "Five-SeveN": [
    { left: 29, top: 43, width: 119, height: 119 },
    { left: 317, top: 241, width: 116, height: 116 },
    { left: 175, top: 111, width: 124, height: 124 },
    { left: 314, top: 108, width: 126, height: 126 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "G3SG1": [
    { left: 0, top: 64, width: 139, height: 139 },
    { left: 386, top: 212, width: 126, height: 126 },
    { left: 250, top: 46, width: 142, height: 142 },
    { left: 239, top: 146, width: 154, height: 154 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "M4A1-S": [
    { left: 424, top: 142, width: 88, height: 88 },
    { left: 309, top: 207, width: 115, height: 115 },
    { left: 0, top: 22, width: 208, height: 208 },
    { left: 299, top: 97, width: 115, height: 115 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "MAC-10": [
    { left: 129, top: 88, width: 113, height: 113 },
    { left: 271, top: 145, width: 115, height: 115 },
    { left: 106, top: 0, width: 139, height: 139 },
    { left: 275, top: 36, width: 148, height: 148 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "MAG-7": [
    { left: 76, top: 28, width: 166, height: 166 },
    { left: 367, top: 196, width: 113, height: 113 },
    { left: 410, top: 126, width: 102, height: 102 },
    { left: 263, top: 83, width: 142, height: 142 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "MP5-SD": [
    { left: 224, top: 54, width: 129, height: 129 },
    { left: 0, top: 3, width: 190, height: 190 },
    { left: 437, top: 108, width: 75, height: 75 },
    { left: 303, top: 116, width: 156, height: 156 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "MP7": [
    { left: 55, top: 15, width: 129, height: 129 },
    { left: 106, top: 119, width: 142, height: 142 },
    { left: 240, top: 229, width: 140, height: 140 },
    { left: 269, top: 70, width: 156, height: 156 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "MP9": [
    { left: 55, top: 15, width: 129, height: 129 },
    { left: 106, top: 119, width: 142, height: 142 },
    { left: 232, top: 235, width: 140, height: 140 },
    { left: 244, top: 73, width: 156, height: 156 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "P2000": [
    { left: 310, top: 241, width: 110, height: 110 },
    { left: 75, top: 64, width: 117, height: 117 },
    { left: 204, top: 150, width: 111, height: 111 },
    { left: 273, top: 81, width: 115, height: 115 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "PP-Bizon": [
    { left: 331, top: 171, width: 110, height: 110 },
    { left: 11, top: 53, width: 117, height: 117 },
    { left: 55, top: 113, width: 111, height: 111 },
    { left: 164, top: 92, width: 115, height: 115 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "Sawed-Off": [
    { left: 229, top: 130, width: 88, height: 88 },
    { left: 436, top: 199, width: 76, height: 76 },
    { left: 375, top: 180, width: 72, height: 72 },
    { left: 10, top: 88, width: 124, height: 124 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "SCAR-20": [
    { left: 309, top: 250, width: 88, height: 88 },
    { left: 436, top: 199, width: 76, height: 76 },
    { left: 161, top: 57, width: 133, height: 133 },
    { left: 284, top: 129, width: 124, height: 124 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "USP-S": [
    { left: 343, top: 174, width: 88, height: 88 },
    { left: 420, top: 234, width: 76, height: 76 },
    { left: 76, top: 57, width: 115, height: 115 },
    { left: 321, top: 87, width: 130, height: 130 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "XM1014": [
    { left: 345, top: 211, width: 88, height: 88 },
    { left: 430, top: 210, width: 76, height: 76 },
    { left: 38, top: 83, width: 115, height: 115 },
    { left: 272, top: 100, width: 130, height: 130 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "AWP": [
    { left: 0, top: 60, width: 188, height: 188 },
    { left: 247, top: 35, width: 136, height: 136 },
    { left: 421, top: 215, width: 76, height: 76 },
    { left: 281, top: 152, width: 130, height: 130 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "P250": [
    { left: 199, top: 154, width: 99, height: 99 },
    { left: 303, top: 77, width: 102, height: 102 },
    { left: 307, top: 200, width: 81, height: 81 },
    { left: 97, top: 26, width: 123, height: 123 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "SSG 08": [
    { left: 0, top: 73, width: 173, height: 173 },
    { left: 266, top: 70, width: 102, height: 102 },
    { left: 431, top: 216, width: 81, height: 81 },
    { left: 311, top: 184, width: 123, height: 123 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "CZ75-Auto": [
    { left: 70, top: 30, width: 128, height: 128 },
    { left: 149, top: 167, width: 117, height: 117 },
    { left: 331, top: 179, width: 128, height: 128 },
    { left: 270, top: 49, width: 143, height: 143 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "Desert Eagle": [
    { left: 258, top: 153, width: 100, height: 100 },
    { left: 327, top: 211, width: 124, height: 124 },
    { left: 370, top: 97, width: 92, height: 92 },
    { left: 61, top: 20, width: 172, height: 172 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "Glock-18": [
    { left: 232, top: 156, width: 100, height: 100 },
    { left: 325, top: 217, width: 124, height: 124 },
    { left: 55, top: 52, width: 128, height: 128 },
    { left: 304, top: 96, width: 125, height: 125 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "R8 Revolver": [
    { left: 251, top: 163, width: 100, height: 100 },
    { left: 62, top: 24, width: 124, height: 124 },
    { left: 343, top: 223, width: 128, height: 128 },
    { left: 243, top: 58, width: 138, height: 138 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "Tec-9": [
    { left: 154, top: 257, width: 125, height: 125 },
    { left: 383, top: 144, width: 124, height: 124 },
    { left: 23, top: 46, width: 157, height: 157 },
    { left: 243, top: 97, width: 130, height: 130 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "P90": [
    { left: 149, top: 202, width: 125, height: 125 },
    { left: 304, top: 221, width: 124, height: 124 },
    { left: 309, top: 105, width: 123, height: 123 },
    { left: 128, top: 49, width: 148, height: 148 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "Galil AR": [
    { left: 99, top: 43, width: 147, height: 147 },
    { left: 397, top: 160, width: 115, height: 115 },
    { left: 263, top: 221, width: 123, height: 123 },
    { left: 316, top: 88, width: 121, height: 121 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "M4A4": [
    { left: 387, top: 141, width: 125, height: 125 },
    { left: 278, top: 211, width: 128, height: 128 },
    { left: 0, top: 12, width: 165, height: 165 },
    { left: 272, top: 91, width: 132, height: 132 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "SG 553": [
    { left: 99, top: 43, width: 147, height: 147 },
    { left: 401, top: 194, width: 107, height: 107 },
    { left: 263, top: 221, width: 123, height: 123 },
    { left: 316, top: 88, width: 121, height: 121 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "M249": [
    { left: 120, top: 61, width: 147, height: 147 },
    { left: 405, top: 206, width: 107, height: 107 },
    { left: 270, top: 238, width: 123, height: 123 },
    { left: 247, top: 103, width: 121, height: 121 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "Negev": [
    { left: 418, top: 231, width: 94, height: 94 },
    { left: 90, top: 56, width: 140, height: 140 },
    { left: 283, top: 247, width: 125, height: 125 },
    { left: 301, top: 134, width: 125, height: 125 },
    { left: 0, top: 0, width: 512, height: 384 },
  ],
  "Nova": [
    { left: 103, top: 83, width: 94, height: 94 },
    { left: 425, top: 217, width: 87, height: 87 },
    { left: 216, top: 104, width: 89, height: 89 },
    { left: 331, top: 146, width: 98, height: 98 },
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

  const imageDir = '../webscraper/skins';
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


