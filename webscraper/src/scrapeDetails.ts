import { Page } from "puppeteer";

export async function scrapeSkinDetails(page: Page, url: string) {
  await page.goto(url, { waitUntil: "networkidle2" });

  const [description, rarity, caseInfo, prices, imgUrl] = await Promise.all([
    extractDescription(page),
    extractRarity(page),
    extractCaseAndCollection(page),
    extractPrices(page),
    extractImageUrl(page),
  ]);

  return {
    description,
    rarity,
    case: caseInfo.caseName,
    collection: caseInfo.collection,
    prices,
    imgUrl,
  };
}

async function extractDescription(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const rows = document.querySelectorAll(".skin-misc-details p");
    for (const row of rows) {
      const strong = row.querySelector("strong");
      if (strong?.textContent?.includes("Description")) {
        return row.textContent?.replace(strong.textContent, "").trim() || null;
      }
    }
    return null;
  });
}

async function extractRarity(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const el = document.querySelector("a.nounderline p.nomargin");
    return el?.textContent?.trim() || null;
  });
}

async function extractCaseAndCollection(page: Page): Promise<{ caseName: string | null, collection: string | null }> {
  return page.evaluate(() => {
    const wrapper = document.querySelector("div.skin-details-collection-container-wrapper");
    const caseName = wrapper?.querySelector("p.collection-text-label")?.textContent?.trim() || null;
    const collection = wrapper?.querySelector("img")?.getAttribute("alt")?.trim() || null;
    return { caseName, collection };
  });
}

async function extractPrices(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => {
    const result: Record<string, string> = {};
    const rows = document.querySelectorAll("#prices .btn-group-sm.btn-group-justified > a");
    for (const row of rows) {
      const wear = row.querySelector("span.pull-left")?.textContent?.trim();
      const price = row.querySelector("span.pull-right")?.textContent?.trim();
      if (wear && price) {
        result[wear] = price;
      }
    }
    return result;
  });
}

async function extractImageUrl(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const img = document.querySelector("img.main-skin-img");
    return img?.getAttribute("src") || null;
  });
}

