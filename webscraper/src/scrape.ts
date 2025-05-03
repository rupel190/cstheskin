import { Browser } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs/promises';
import { scrapeSkinDetails } from './scrapeDetails';
import { ScrapeImages } from './scrapeImages';
import fetch from 'node-fetch';
import path, { join } from 'path';

puppeteer.use(StealthPlugin());

async function scrapeUrl(browser: Browser, url: string) {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });
  await page.screenshot({ path: "debug.png" });

  const cardSelector = "div.col-lg-4.col-md-6.col-widen.text-center";
  await page.waitForSelector(cardSelector);

  // Fetch all skin cards
  const cards = await page.$$eval(cardSelector, (elements) =>
    elements.map((el) => {
      const name = el.querySelector("h3")?.textContent?.trim() || "";
      const link = el.querySelector("div.details-link a")?.getAttribute("href") || "";
      return { name, link };
    })
  );
  return cards;
}

function getReplaced(name: string, prefix: string) {
  const cleanName = name.replace(/ /g, "_").trim();
  const outPath = path.join(prefix, `${cleanName}.png`);
  return outPath;
}


(async () => {
  // Launch a headless browser
  const browser = await puppeteer.launch();
  const url = 'https://stash.clash.gg/case/339/Dreams-&-Nightmares-Case';
  // const url = 'https://stash.clash.gg/case/307/Fracture-Case';
  // const url = 'https://stash.clash.gg/case/355/Recoil-Case';
  // const url = 'https://stash.clash.gg/case/376/Revolution-Case';
  // const url = 'https://stash.clash.gg/case/38/Chroma-Case';
  // const url = 'https://stash.clash.gg/case/48/Chroma-2-Case';
  const outputFileName = url.split('/').pop();


  try {
    const cards = await scrapeUrl(browser, url);
    console.log(`Found ${cards.length} cards. Processing ${cards.length - 1} cards (skipping first).`);

    // Create array to store all skin details
    const allSkinDetails = [];

    // Skip the first card (index 0) and process the rest
    for (let i = 1; i < cards.length; i++) {
      const card = cards[i];
      console.log(`Processing ${i}/${cards.length - 1}: ${card.name}`);

      try {
        const cardPage = await browser.newPage();
        // Fetch card details
        const details = await scrapeSkinDetails(cardPage, card.link);

        // Download images
        const imgScraper = new ScrapeImages(cardPage);
        const outPathSkin = getReplaced(card.name, "skins");
        const outPathCase = getReplaced(details.case ?? "", "cases");
        const outPathCollection = getReplaced(details.collection ?? "", "collections");
        await imgScraper.scrapeSkinImage(outPathSkin);
        // Currently only one collection at a time is scraped, so saving those images once is sufficient
        if (i == 1) {
          await imgScraper.scrapeCaseImage(outPathCase);
          await imgScraper.scrapeCollectionImage(outPathCollection);
        }

        const skinData = {
          // append more to details
          name: card.name,
          link: card.link,
          outPathSkin: outPathSkin,
          outPathCase: outPathCase,
          outPathCollection: outPathCollection,
          ...details
        };

        // Append details
        allSkinDetails.push(skinData);

        await cardPage.close();
        console.log(`Successfully processed: ${card.name}`);
      } catch (error) {
        console.error(`Error processing ${card.name}: ${error}`);
        // Continue with next card even if one fails
      }
    }

    // Save all data to a JSON file
    const fileName = `${outputFileName}-${new Date().toISOString().slice(0, 10)}.json`;
    const fullPath = fileName;
    await fs.writeFile(fullPath, JSON.stringify(allSkinDetails, null, 2));
    console.log(`Successfully saved ${allSkinDetails.length} skin details to ${fileName}`);

  } catch (error) {
    console.error('An error occurred during scraping:', error);
  } finally {
    // Always close the browser
    await browser.close();
    console.log('Browser closed');
  }
})();


