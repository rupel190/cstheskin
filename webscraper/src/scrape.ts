import { Browser } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs/promises';
import fetch from 'node-fetch';
import path from 'path';

puppeteer.use(StealthPlugin());

async function scrapeUrl(browser: Browser, url: string) {
  const page = await browser.newPage();
  // Navigate to the URL
  await page.goto(url, { waitUntil: 'networkidle2' });

  await page.screenshot({ path: "debug.png" });

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

async function downloadSkinImage(browser: Browser, url: string, outputPath: string) {
  try {
    // Make sure the directory exists
    const directory = path.dirname(outputPath);
    await fs.mkdir(directory, { recursive: true });

    // Open a new page
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Wait for the image to load
    const imgSelector = "div.well.result-box.nomargin img.img-responsive.center-block.main-skin-img";
    await page.waitForSelector(imgSelector);

    // Get the image element and take a screenshot of just that element
    const imageElement = await page.$(imgSelector);
    if (imageElement) {
      await imageElement.screenshot({
        path: outputPath,
        type: 'png',
        omitBackground: true
      });
      console.log(`Saved skin image to ${outputPath}`);
    } else {
      console.log(`Image element not found for ${url}`);
    }

    // Close the page
    await page.close();
  } catch (error) {
    console.error(`Error capturing skin image from ${url}:`, error);
  }
}

async function scrapeSkinDetails(browser: Browser, url: string) {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });
  console.log("Opening page:", url);

  // Extract text by label TODO: make generic to include Finish Style, Flavor Text, ...
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

  // Extract imgUrls
  const imgUrl = await page.evaluate(() => {
    // First try to get the sideview image URL
    // const sideviewAnchor = document.querySelector("div.well.result-box.nomargin a.image-popup-vertical-fit.misc-click");
    // if (sideviewAnchor && sideviewAnchor.getAttribute("href")) {
    //   console.log("!!!! ", sideviewAnchor.getAttribute("href"));
    //   return sideviewAnchor.getAttribute("href");
    // }
    // Fallback to perspective view image
    const perspectiveImg = document.querySelector("div.well.result-box.nomargin img.img-responsive.center-block.main-skin-img");

    console.log(perspectiveImg?.getAttribute("src"));
    return perspectiveImg ? perspectiveImg.getAttribute("src") : null;
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

  // Combine all data
  return {
    description,
    // flavorText,
    rarity,
    // floatRange,
    prices,
    imgUrl
  };
}

(async () => {
  // Launch a headless browser
  const browser = await puppeteer.launch();
  const url = 'https://stash.clash.gg/case/339/Dreams-&-Nightmares-Case';
  const outputFileName = url.split('/').pop();

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
          localImagePath: "",
          ...details
        };

        allSkinDetails.push(skinData);

        const imgName = card.name.replace(/ /g, '_');
        const imgPath = `./images/${imgName}.png`;        // Take a screenshot of the skin image
        await downloadSkinImage(browser, card.link, imgPath);
        skinData.localImagePath = imgPath;

        console.log(`Successfully processed: ${card.name}`);
      } catch (error) {
        console.error(`Error processing ${card.name}: ${error}`);
        // Continue with next card even if one fails
      }
    }

    // Save all data to a JSON file
    const fileName = `${outputFileName}-${new Date().toISOString().slice(0, 10)}.json`;
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


