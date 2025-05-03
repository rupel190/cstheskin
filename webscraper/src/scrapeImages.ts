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

  async scrapeSkinImage(exportPath: string) {
    const imgSelector = "a.image-popup-vertical-fit.misc-click img.main-skin-img"
    await this.saveImage(imgSelector, exportPath);
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


