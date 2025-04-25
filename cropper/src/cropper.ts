import sharp, { Metadata } from 'sharp';
import fs from 'fs/promises';
import path, { delimiter } from 'path';

type CropBox = { left: number; top: number; width: number; height: number };

const skinSizeFrequency: Record<string, CropBox> = {
  'AK-47': { left: 20, top: 20, width: 200, height: 150 },
  'Dual Berettas': { left: 20, top: 20, width: 300, height: 300 },
  // add more...
};

function getSkinFromFileName(filename: string): string {
  const base = path.basename(filename); // MP7_|_Abyssal_Apparition.png
  const skin = base.split("|")[0].trim();
  return skin.replace(/_/g, " ").trim();
}

async function cropImage(inputPath: string, outputPath: string, cropTemplate: CropBox) {
  const metadata = await sharp(inputPath).metadata();
  console.log(`🖼 ${inputPath} - ${metadata.width}x${metadata.height}`);
  console.log("!!!", inputPath, cropTemplate, outputPath)
  await sharp(inputPath)
    .extract(cropTemplate)
    .toFile(outputPath);
}

async function cropImageToFile(skin: string, filePath: string, outputDir: string, template: Record<string, CropBox>) {
  if (template) {
    const outPath = path.join(outputDir, path.basename(filePath));
    await cropImage(filePath, outPath, template[skin]);
    console.log(`✅ Cropped ${skin}: ${filePath}`);
  } else {
    console.warn(`❌ No crop template for: ${skin}`);
  }
}

async function updateDimensionsFrequency(imgDimensions: Record<string, { count: number, sizes: Set<string> }>, skin: string, meta: Metadata) {

  const size = `${meta.width}x${meta.height}`;

  if (!imgDimensions[skin]) {
    imgDimensions[skin] = { count: 0, sizes: new Set() };
  }

  imgDimensions[skin].count++;
  imgDimensions[skin].sizes.add(size);
}

(async () => {
  const imageDir = '../webscraper/images/';
  const outputDir = './cropped';
  await fs.mkdir(outputDir, { recursive: true }); // ensure output dir exists
  const files = await fs.readdir(imageDir);
  const fullPaths = files.map(file => path.join(imageDir, file));
  const imgDimensions: Record<string, { count: number, sizes: Set<string> }> = {};
  const skinCropTemplateFull: Record<string, CropBox> = {};
  const skinCropTemplateFirst: Record<string, CropBox> = {};


  try {
    for (const filePath of fullPaths) {
      const skin = getSkinFromFileName(filePath);
      console.log("\nFetched skin: ", skin);

      const meta = await sharp(filePath).metadata();
      await updateDimensionsFrequency(imgDimensions, skin, meta);
      skinCropTemplateFull[skin] = { left: 0, top: 0, width: meta.width ?? 0, height: meta.height ?? 0 };
      let width = meta.width ?? 0;
      let height = meta.height ?? 0;
      const left = 200;
      const top = 100;
      skinCropTemplateFirst[skin] = { left, top, width: width - left, height: height - top };

      //TODO: crop multiple per image
      // await cropImageToFile(skin, filePath, outputDir, skinCropTemplateFull);
      await cropImageToFile(skin, filePath, outputDir, skinCropTemplateFirst);
    }
    // console.log("\nDimension statistics: ", imgDimensions);
    console.log("\Used dimensions:", skinCropTemplateFull);
  } catch (err) {
    console.error("💥 Error:", err);
  }
})();


