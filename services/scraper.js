import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
dotenv.config();

const CHROME_PROFILE = process.env.CHROME_PROFILE_PATH || '';

// ── Browser factory ───────────────────────────────────────────────────────────

async function getBrowser(useProfile = false) {
  const args = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'];
  const opts = {
    headless: false,
    args,
    defaultViewport: null
  };

  if (useProfile && CHROME_PROFILE) {
    opts.userDataDir = CHROME_PROFILE;
  }

  return puppeteer.launch(opts);
}

async function getHeadlessBrowser() {
  return puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
}

// ── Generic URL scraper ───────────────────────────────────────────────────────
// Opens any job URL and extracts the job content

export async function scrapeJobFromURL(url) {
  const browser = await getHeadlessBrowser();
  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait a moment for JS-rendered content
    await new Promise(r => setTimeout(r, 2000));

    const html = await page.content();
    const $ = cheerio.load(html);

    // Remove noise elements
    $('script, style, nav, footer, header, iframe, .ad, .advertisement').remove();

    // Try common job description selectors
    const selectors = [
      '[class*="job-description"]',
      '[class*="description"]',
      '[class*="job-details"]',
      '[class*="job_description"]',
      '[id*="job-description"]',
      '[id*="description"]',
      'article',
      'main',
      '.content'
    ];

    let description = '';
    for (const sel of selectors) {
      const el = $(sel).first();
      if (el.length && el.text().trim().length > 100) {
        description = el.text().replace(/\s+/g, ' ').trim();
        break;
      }
    }

    if (!description) {
      description = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 3000);
    }

    // Try to extract title and company
    const title =
      $('h1').first().text().trim() ||
      $('[class*="title"]').first().text().trim() ||
      'Unknown Title';

    const company =
      $('[class*="company"]').first().text().trim() ||
      $('[class*="employer"]').first().text().trim() ||
      'Unknown Company';

    return {
      title: title.substring(0, 100),
      company: company.substring(0, 100),
      description: description.substring(0, 4000),
      url,
      source: 'url',
      postedDate: new Date().toISOString()
    };
  } finally {
    await browser.close();
  }
}

// ── LinkedIn scraper ──────────────────────────────────────────────────────────
// Uses your Chrome profile (you must be logged in to LinkedIn in that profile)

export async function scrapeLinkedInJobs(query, maxJobs = 10) {
  if (!CHROME_PROFILE) {
    throw new Error('CHROME_PROFILE_PATH not set in .env — required for LinkedIn scraping');
  }

  const browser = await getBrowser(true);
  const jobs = [];

  try {
    const page = await browser.newPage();
    const encoded = encodeURIComponent(query);
    // r604800 = last 7 days
    const url = `https://www.linkedin.com/jobs/search/?keywords=${encoded}&f_TPR=r604800&sortBy=DD`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // Scroll to load more jobs
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 800));
      await new Promise(r => setTimeout(r, 1000));
    }

    const html = await page.content();
    const $ = cheerio.load(html);

    const cards = $('.job-search-card, .jobs-search__results-list li, [data-entity-urn]');

    cards.each((i, el) => {
      if (i >= maxJobs) return false;
      const title = $(el).find('.job-search-card__title, h3').first().text().trim();
      const company = $(el).find('.job-search-card__company-name, h4').first().text().trim();
      const location = $(el).find('.job-search-card__location').first().text().trim();
      const href = $(el).find('a').first().attr('href');
      const jobUrl = href ? (href.startsWith('http') ? href : `https://www.linkedin.com${href}`) : '';
      const dateEl = $(el).find('time').first();
      const postedDate = dateEl.attr('datetime') || new Date().toISOString();

      if (title) {
        jobs.push({ title, company, location, url: jobUrl, postedDate, source: 'linkedin', description: '' });
      }
    });

    // Fetch descriptions for each job
    for (const job of jobs) {
      if (!job.url) continue;
      try {
        await page.goto(job.url, { waitUntil: 'networkidle2', timeout: 20000 });
        await new Promise(r => setTimeout(r, 2000));
        const jHtml = await page.content();
        const j$ = cheerio.load(jHtml);
        const desc = j$('.job-view-layout, .description__text, [class*="description"]').first().text()
          .replace(/\s+/g, ' ').trim();
        job.description = desc.substring(0, 4000);
      } catch {
        job.description = `${job.title} at ${job.company}`;
      }
    }
  } finally {
    await browser.close();
  }

  return jobs;
}

// ── Internshala scraper ───────────────────────────────────────────────────────

export async function scrapeInternshalaJobs(query, maxJobs = 10) {
  const browser = await getHeadlessBrowser();
  const jobs = [];

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    const slug = query.toLowerCase().replace(/\s+/g, '-');
    await page.goto(`https://internshala.com/jobs/${slug}-jobs`, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    const html = await page.content();
    const $ = cheerio.load(html);

    $('.internship_meta, .individual_internship').each((i, el) => {
      if (i >= maxJobs) return false;
      const title = $(el).find('.job-title, .profile').first().text().trim();
      const company = $(el).find('.company-name').first().text().trim();
      const location = $(el).find('.location_link, .locations').first().text().trim();
      const href = $(el).find('a').first().attr('href');
      const jobUrl = href ? `https://internshala.com${href}` : '';
      const posted = $(el).find('.status-container').first().text().trim();

      if (title) {
        jobs.push({
          title, company, location,
          url: jobUrl,
          postedDate: new Date().toISOString(),
          postedText: posted,
          source: 'internshala',
          description: ''
        });
      }
    });

    // Get descriptions
    for (const job of jobs) {
      if (!job.url) continue;
      try {
        await page.goto(job.url, { waitUntil: 'networkidle2', timeout: 20000 });
        await new Promise(r => setTimeout(r, 1500));
        const jHtml = await page.content();
        const j$ = cheerio.load(jHtml);
        const desc = j$('#about_work, .about_company_text, [class*="detail"]').text()
          .replace(/\s+/g, ' ').trim();
        job.description = desc.substring(0, 4000);
      } catch {
        job.description = `${job.title} at ${job.company}`;
      }
    }
  } finally {
    await browser.close();
  }

  return jobs;
}

// ── Indeed scraper ────────────────────────────────────────────────────────────

export async function scrapeIndeedJobs(query, maxJobs = 10) {
  const browser = await getHeadlessBrowser();
  const jobs = [];

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    const encoded = encodeURIComponent(query);
    await page.goto(
      `https://in.indeed.com/jobs?q=${encoded}&fromage=7&sort=date`,
      { waitUntil: 'networkidle2', timeout: 30000 }
    );
    await new Promise(r => setTimeout(r, 2000));

    const html = await page.content();
    const $ = cheerio.load(html);

    $('[class*="job_seen_beacon"], [class*="resultContent"]').each((i, el) => {
      if (i >= maxJobs) return false;
      const title = $(el).find('[class*="jobTitle"]').first().text().trim();
      const company = $(el).find('[class*="companyName"]').first().text().trim();
      const location = $(el).find('[class*="companyLocation"]').first().text().trim();
      const href = $(el).find('a[id*="job"]').first().attr('href') ||
                   $(el).find('a').first().attr('href');
      const jobUrl = href ? (href.startsWith('http') ? href : `https://in.indeed.com${href}`) : '';

      if (title) {
        jobs.push({
          title, company, location,
          url: jobUrl,
          postedDate: new Date().toISOString(),
          source: 'indeed',
          description: ''
        });
      }
    });

    // Get descriptions
    for (const job of jobs) {
      if (!job.url) continue;
      try {
        await page.goto(job.url, { waitUntil: 'networkidle2', timeout: 20000 });
        await new Promise(r => setTimeout(r, 1500));
        const jHtml = await page.content();
        const j$ = cheerio.load(jHtml);
        const desc = j$('[class*="jobDescriptionText"], #jobDescriptionText').text()
          .replace(/\s+/g, ' ').trim();
        job.description = desc.substring(0, 4000);
      } catch {
        job.description = `${job.title} at ${job.company}`;
      }
    }
  } finally {
    await browser.close();
  }

  return jobs;
}

// ── Naukri scraper ────────────────────────────────────────────────────────────

export async function scrapeNaukriJobs(query, maxJobs = 10) {
  const browser = await getHeadlessBrowser();
  const jobs = [];

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    const slug = query.toLowerCase().replace(/\s+/g, '-');
    await page.goto(
      `https://www.naukri.com/${slug}-jobs?experience=0`,
      { waitUntil: 'networkidle2', timeout: 30000 }
    );
    await new Promise(r => setTimeout(r, 2500));

    const html = await page.content();
    const $ = cheerio.load(html);

    $('[class*="jobTuple"], article.jobTuple').each((i, el) => {
      if (i >= maxJobs) return false;
      const title = $(el).find('[class*="title"]').first().text().trim();
      const company = $(el).find('[class*="companyInfo"]').first().text().trim();
      const location = $(el).find('[class*="location"]').first().text().trim();
      const href = $(el).find('a[class*="title"]').attr('href') ||
                   $(el).find('a').first().attr('href');

      if (title) {
        jobs.push({
          title, company, location,
          url: href || '',
          postedDate: new Date().toISOString(),
          source: 'naukri',
          description: ''
        });
      }
    });

    // Get descriptions (Naukri loads descriptions on click, so we navigate)
    for (const job of jobs) {
      if (!job.url) continue;
      try {
        await page.goto(job.url, { waitUntil: 'networkidle2', timeout: 20000 });
        await new Promise(r => setTimeout(r, 2000));
        const jHtml = await page.content();
        const j$ = cheerio.load(jHtml);
        const desc = j$('[class*="job-desc"], [class*="description"]').text()
          .replace(/\s+/g, ' ').trim();
        job.description = desc.substring(0, 4000);
      } catch {
        job.description = `${job.title} at ${job.company}`;
      }
    }
  } finally {
    await browser.close();
  }

  return jobs;
}

// ── Assisted Apply (non-headless, user takes over) ────────────────────────────

export async function openForAssist(jobUrl, prefillData = {}) {
  const browser = await getBrowser(true); // use real profile
  const page = await browser.newPage();
  await page.goto(jobUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // Attempt to prefill common fields
  const fills = {
    '[name="name"], [placeholder*="name" i], [id*="name"]': prefillData.name || '',
    '[name="email"], [type="email"], [placeholder*="email" i]': prefillData.email || '',
    '[name="phone"], [type="tel"], [placeholder*="phone" i]': prefillData.phone || '',
    '[name="location"], [placeholder*="location" i]': prefillData.location || ''
  };

  for (const [selector, value] of Object.entries(fills)) {
    if (!value) continue;
    try {
      const el = await page.$(selector);
      if (el) {
        await el.click({ clickCount: 3 });
        await el.type(value, { delay: 30 });
      }
    } catch {}
  }

  // Don't close the browser — user reviews and submits manually
  // Return browser instance (server keeps it alive until user closes)
  return { success: true, message: 'Browser opened. Review the page and submit manually.' };
}
