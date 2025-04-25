import { Browser, Puppeteer } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs/promises';


async function findImages(browser: Browser, url: string) {
  const page = await browser.newPage();
  // Navigate to the URL
  await page.goto(url, { waitUntil: 'networkidle2' });

  // await page.screenshot({ path: "debug.png" });

  // Wait for a specific element to be loaded
  const cardSelector = "div.col-lg-4.col-md-6.col-widen.text-center";
  // console.log(await page.content());
  await page.waitForSelector(cardSelector);

  // Scrape the content
  const cards = await page.$$eval(cardSelector, (elements) =>
    elements.map((el) => {
      const name = el.querySelector("h3")?.textContent?.trim() || "";
      const link = el.querySelector("div.details-link a")?.getAttribute("href") || "";
      return { name, link };
    })
  );
  return cards;
}


async function scrapeSkinDetails(browser: Browser, url: string) {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });
  console.log("Opening page:", url);

  // Extract text by label
  const description = await page.evaluate(() => {
    const rows = document.querySelectorAll(".skin-misc-details p");
    for (const row of rows) {
      const strong = row.querySelector("strong");
      if (strong && strong.textContent && strong.textContent.includes("Description")) {
        return row.textContent ? row.textContent.replace(strong.textContent, "").trim() || null : null;
      }
    }
    return null;
  });

  // Extract flavor text
  const flavorText = await page.evaluate(() => {
    const rows = document.querySelectorAll(".skin-misc-details p");
    for (const row of rows) {
      const strong = row.querySelector("strong");
      if (strong && strong.textContent && strong.textContent.includes("Flavor Text")) {
        return row.textContent ? row.textContent.replace(strong.textContent, "").trim() || null : null;
      }
    }
    return null;
  });

  // Extract rarity
  const rarity = await page.evaluate(() => {
    const el = document.querySelector("div.well.result-box.nomargin a.nounderline p.nomargin");
    return el && el.textContent ? el.textContent.trim() : null;
  });

  // Extract prices
  const prices = await page.evaluate(() => {
    const result: Record<string, string> = {};
    const rows = document.querySelectorAll("div#prices .btn-group-sm.btn-group-justified > a");
    for (const row of rows) {
      const wear = row.querySelector("span.pull-left");
      const price = row.querySelector("span.pull-right");
      if (wear && wear.textContent && price && price.textContent) {
        const test = wear.textContent.trim();
        result[test] = price.textContent.trim();
      }
    }
    return result;
  });

  // // Extract float range
  // const floatRange = await page.evaluate(() => {
  //   const el = document.querySelector(".range-display > span");
  //   return el && el.textContent ? el.textContent.trim() : null;
  // });

  // Combine all data
  return {
    description,
    flavorText,
    rarity,
    // floatRange,
    prices
  };
}

(async () => {
  // Launch a headless browser
  const browser = await puppeteer.launch();
  const url = 'https://stash.clash.gg/case/422/Fever-Case';

  try {
    // Get all cards
    const cards = await scrapeUrl(browser, url);
    console.log(`Found ${cards.length} cards. Processing ${cards.length - 1} cards (skipping first).`);

    // Create array to store all skin details
    const allSkinDetails = [];

    // Skip the first card (index 0) and process the rest
    for (let i = 1; i < cards.length; i++) {
      const card = cards[i];
      console.log(`Processing ${i}/${cards.length - 1}: ${card.name}`);

      try {
        const details = await scrapeSkinDetails(browser, card.link);

        // Add card info to details
        const skinData = {
          name: card.name,
          link: card.link,
          ...details
        };

        allSkinDetails.push(skinData);
        console.log(`Successfully processed: ${card.name}`);
      } catch (error) {
        console.error(`Error processing ${card.name}: ${error}`);
        // Continue with next card even if one fails
      }
    }

    // Save all data to a JSON file
    const fileName = `fever-case-skins-${new Date().toISOString().slice(0, 10)}.json`;
    await fs.writeFile(fileName, JSON.stringify(allSkinDetails, null, 2));
    console.log(`Successfully saved ${allSkinDetails.length} skin details to ${fileName}`);

  } catch (error) {
    console.error('An error occurred during scraping:', error);
  } finally {
    // Always close the browser
    await browser.close();
    console.log('Browser closed');
  }
})();
