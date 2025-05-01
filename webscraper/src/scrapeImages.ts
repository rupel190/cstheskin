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

  async scrapeSkinImage(name: string): Promise<string> {
    const outPath = `./images/skins/${name}.png`;
    const imgSelector = "a.image-popup-vertical-fit.misc-click img.main-skin-img"
    await this.saveImage(imgSelector, outPath);
    return outPath;
  }

  async scrapeCaseImage(name: string): Promise<string> {
    const outPath = `./images/cases/${name}.png`;
    const imgSelector = "div.skin-details-collection-container-wrapper a img";
    await this.saveImage(imgSelector, outPath);
    return outPath;
  }

  async scrapeCollectionImage(name: string): Promise<string> {
    const outPath = `./images/collections/${name}.png`;
    const imgSelector = "div.collection-header img"
    await this.saveImage(imgSelector, outPath);
    return outPath;
  }
}


