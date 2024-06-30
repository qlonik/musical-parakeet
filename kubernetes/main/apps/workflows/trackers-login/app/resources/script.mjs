import puppeteer, { KnownDevices } from "puppeteer";
import { promisify, inspect } from "util";

/**
 * @typedef {Object} SiteConf
 * @property {string} url
 * @property {string} usernameSelector
 * @property {string} username
 * @property {string} passwordSelector
 * @property {string} password
 * @property {string} loginSelector
 * @property {string} afterLoginSelector
 */

/** @type {Array<SiteConf>} */
const config = JSON.parse(process.env.TRACKERS_LOGIN_CONFIG);

const browser = await puppeteer.launch();

const results = await Promise.allSettled(
  config.map(
    async ({
      url,
      usernameSelector,
      username,
      passwordSelector,
      password,
      loginSelector,
      afterLoginSelector,
    }) => {
      const context = await browser.createBrowserContext();

      const page = await context.newPage();
      await page.emulate(KnownDevices["iPad Pro 11 landscape"]);

      await page.goto(url, { waitUntil: "networkidle0" });

      await page.locator(usernameSelector).fill(username);
      await page.locator(passwordSelector).fill(password);
      await page.locator(loginSelector).click();
      await page.waitForNetworkIdle();

      await page.locator(afterLoginSelector).click();
      await page.waitForNetworkIdle();

      await promisify(setTimeout)(2000);

      await context.close();

      return url;
    },
  ),
);

console.log(inspect(results, { depth: null }));

await browser.close();
