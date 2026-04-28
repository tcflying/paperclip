const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  await page.goto("http://192.168.50.233:3100/sign-in");
  await page.fill('input[type="email"]', "datobig18@gmail.com");
  await page.fill('input[type="password"]', "666888abc");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  console.log("After login:", page.url());

  await page.goto("http://192.168.50.233:3100/DA/issues/DA-1");
  await page.waitForTimeout(5000);
  console.log("Issue URL:", page.url());

  const title = await page.title();
  console.log("Title:", title);

  const allText = await page.evaluate(() => document.body.innerText);
  console.log("\n=== PAGE CONTENT (first 5000 chars) ===");
  console.log(allText.substring(0, 5000));

  await page.screenshot({ path: "d:\\trae-project\\tc-paperclip\\da-issue1-full.png", fullPage: true });
  console.log("\nScreenshot saved to da-issue1-full.png");

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
