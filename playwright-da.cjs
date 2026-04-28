const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  await page.goto("http://192.168.50.233:3100/sign-in");
  await page.fill('input[type="email"], input[name="email"]', "datobig18@gmail.com");
  await page.fill('input[type="password"], input[name="password"]', "666888abc");
  await page.click('button[type="submit"], button:has-text("Sign")');

  await page.waitForTimeout(3000);
  console.log("After login URL:", page.url());

  await page.goto("http://192.168.50.233:3100/DA/issues/DA-1");
  await page.waitForTimeout(3000);
  console.log("Issue page URL:", page.url());

  const allText = await page.evaluate(() => {
    const issueEl = document.querySelector('[class*="issue"], [class*="Issue"], main, article, [role="main"]');
    return issueEl ? issueEl.innerText : document.body.innerText;
  });
  console.log("\n=== PAGE TEXT ===");
  console.log(allText.substring(0, 5000));

  await page.screenshot({ path: "d:\\trae-project\\tc-paperclip\\da-screenshot.png", fullPage: true });
  console.log("\nScreenshot saved");

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
