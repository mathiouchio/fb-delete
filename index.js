const puppeteer = require("puppeteer");
const prompts = require("./prompts");
const date = require("./date");
const { DEBUG } = process.env;

let navStore = {};
let page;
let answers;
let browser;
let results = {};
const debug = DEBUG === "true";

const runReport = () => {
  Object.keys(results).forEach(key => {
    const count = results[key].length;
    console.log(`Deleted ${key} ${count} number of times.`);
  });
};

const escapeXpathString = str => {
  const splitedQuotes = str.replace(/'/g, `', "'", '`);
  return `concat('${splitedQuotes}', '')`;
};

const getAttributes = async (handlers, property) => {
  const propertyJsHandles = await Promise.all(
    handlers.map(handle => handle.getProperty(property))
  );
  const attributes = await Promise.all(
    propertyJsHandles.map(handle => handle.jsonValue())
  );

  return attributes;
};

const followLinkByContent = async (
  text,
  opt = { waitUntil: null, store: null }
) => {
  if (opt.waitUntil === "load") {
    if (debug) console.log("followLinkByContent wait for load", text);
    await page.waitForNavigation({ waitUntil: "load" });
  } else {
    if (debug) console.log("followLinkByContent no wait for load", text);
  }

  const escapedText = escapeXpathString(text);
  const linkHandlers = await page.$x(`//a[contains(text(), ${escapedText})]`);

  if (linkHandlers.length > 0) {
    if (opt.store) {
      const href = await getAttributes(linkHandlers, "href");
      opt.store[text] = href[0];
    }
    await linkHandlers[0].click();
  } else {
    throw new Error(errorLog(`Link not found: ${text}`));
  }
};

const storeCategoryLinks = async () => {
  await page.waitForNavigation({ waitUntil: "load" });
  const $parentWrapper = await page.$("#objects_container");
  const categoryKeys = await $parentWrapper.$$eval("a", els =>
    els.map(el => el.innerText)
  );
  const categoryLinks = await $parentWrapper.$$eval("a", els =>
    els.map(el => el.href)
  );
  categoryKeys.forEach((key, index) => {
    navStore[key] = categoryLinks[index];
  });
};

const followCategoryLinkByContent = async text => {
  if (debug) console.log("followCategoryLinkByContent", text);
  await page.goto(navStore[text], { waitUntil: "load" });
};

// Giving pop to error log
const errorLog = msg => ("\x1b[31m", msg, "\x1b[0m");

const selectOption = async () => {
  answers = await prompts();

  let redo = false;
  Object.values(answers).forEach(x => {
    if (x.length === 0) {
      redo = true;
    }
  });

  if (redo) {
    console.log(
      errorLog("Nothing is selected. Press <space> to select options!")
    );
    console.log(answers);
    await selectOption();
  }
};

(async () => {
  await selectOption();
  const args = answers.visual
    ? {
        headless: false,
        slowMo: 100
      }
    : undefined;

  browser = await puppeteer.launch(args);
  page = await browser.newPage();
  page.setDefaultNavigationTimeout(5000);

  await page.goto("https://mbasic.facebook.com/", { waitUntil: "load" });
  await page.$eval(
    "input[id=m_login_email]",
    (el, user) => (el.value = user),
    answers.username
  );
  await page.$eval(
    "input[name=pass]",
    (el, pass) => (el.value = pass),
    answers.password
  );
  await page.$eval("input[name=login]", button => button.click());
  await page.goto("https://mbasic.facebook.com/", { waitUntil: "load" });

  await next(answers.categories, answers.years);
})();

async function next(categories, years) {
  await followLinkByContent("Profile");
  await followLinkByContent("Activity Log", { waitUntil: "load" });
  await followLinkByContent("Filter", { waitUntil: "load", store: navStore });
  await storeCategoryLinks();

  for (let i in categories) {
    const category = categories[i];
    results[category] = [];

    if (i > 0) {
      page.goto(navStore.Filter, { waitUntil: "load" });
    }
    await followCategoryLinkByContent(category);

    for (let j in years) {
      const year = years[j];
      try {
        if (date.currentYear.toString() !== answers.years[j]) {
          await followLinkByContent(year);
        }
        await deleteYear(year, category);
      } catch (e) {
        console.log(`Finished looking for ${category} in year ${year}.`);
      }
    }
  }

  await browser.close();
  console.log("Done!");
  console.log("Deleted: ", results);
  runReport();
  process.exit();
}

async function deletePosts(category) {
  // get all "allactivity/delete" and "allactivity/removecontent" links on page
  const deleteLinks = await page.evaluate(() => {
    const links = [];
    const deleteElements = document.querySelectorAll(
      'a[href*="allactivity/delete"]'
    );
    const removeElements = document.querySelectorAll(
      'a[href*="allactivity/removecontent"]'
    );
    for (const el of deleteElements) {
      links.push(el.href);
    }
    for (const el of removeElements) {
      links.push(el.href);
    }

    return links;
  });

  async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
    }
  }

  if (deleteLinks.length === 0) {
    console.log(`No ${category} content.`);
  } else {
    if (debug) console.log("deleteLinks", deleteLinks);

    await asyncForEach(deleteLinks, async (link, index) => {
      results[category].push(link);
      console.log(`Deleting post number ${index} with link: ${link}`);
      // visit them all to delete content
      try {
        await page.goto(link, { waitUntil: "load" });
      } catch (error) {
        throw new Error(errorLog("Can't delete."));
      }
    });
  }
}

async function getMonthLinks(year) {
  const monthLinks = await page.evaluate(year => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December"
    ];

    const links = [];
    const elements = document.querySelectorAll("a");
    for (let el of elements) {
      for (let i = 0; i < months.length; i++) {
        if (months[i] + " " + year === el.innerText) {
          links.push(el.href);
        }
      }
    }

    return links;
  }, year);

  return monthLinks;
}

async function deleteYear(year, category) {
  if (year !== date.currentYear.toString()) {
    await page.waitForNavigation({ waitUntil: "load" });
  }
  const monLinks = await getMonthLinks(year);

  for (let mon in monLinks) {
    if (debug) console.log(`Going to month ${mon} in year ${year}.`);
    await page.goto(monLinks[mon], { waitUntil: "load" });
    await deletePosts(category);
  }
}
