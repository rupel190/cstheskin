import { Page } from "puppeteer";
import * as fs from "fs/promises";
import * as path from "path";

export class ScrapeImages {
  constructor(private page: Page) {

  }

  private async saveImage(selector: string, outputPath: string) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    const el = await this.page.$(selector);

    if (el) {
      await el.screenshot({ path: outputPath, type: "png", omitBackground: true });
      console.log(`✅ Saved image: ${outputPath}`);
    } else {
      console.warn(`⚠️ Element not found: ${selector}`);
    }
  }

  private async downloadImage(url: string, outputPath: string) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    const response = await fetch(url);
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(outputPath, buffer);
    console.log(`✅ Downloaded image: ${outputPath}`);
  }

  async scrapeSkinImage(exportPath: string) {
    // Find the main skin image and download from Steam CDN
    const selector = "img.img-responsive.center-block.margin-top-sm";
    const el = await this.page.$(selector);

    if (el) {
      const src = await el.evaluate((img) => img.getAttribute("src"));
      if (src) {
        await this.downloadImage(src, exportPath);
        return;
      }
    }
    console.warn(`⚠️ No skin image found`);
  }

  async scrapeCaseImage(exportPath: string) {
    const imgSelector = "div.skin-details-collection-container-wrapper a img[alt*='Case']";
    await this.saveImage(imgSelector, exportPath);
  }

  async scrapeCollectionImage(exportPath: string) {
    const imgSelector = "div.skin-details-collection-container-wrapper a img[alt*='Collection']";
    await this.saveImage(imgSelector, exportPath);
  }
}


