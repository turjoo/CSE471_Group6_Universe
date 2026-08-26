import {
  detectCategory,
  detectExperienceLevel,
  detectJobType,
  detectMinCgpa,
  detectRemote,
  detectSkills,
  fingerprint,
  parseDate,
  stripHtml,
  truncate,
} from "../normalize";
import type { ProviderQuery, ProviderResult, RawJob } from "../types";

/**
 * BDJobs provider.
 *
 * BDJobs publishes no public developer API, so there are only two honest ways
 * to read it: an agreed data feed, or parsing the public search page. This
 * provider does the second, and it is deliberately defensive — BDJobs can
 * change its markup at any time, and when it does this provider returns an
 * empty result with a note instead of throwing.
 *
 * Enable with BDJOBS_ENABLED=true in .env. Keep it off during grading demos
 * unless you have checked that the markup still parses.
 *
 * If your group later gets a partner feed, replace `parseSearchPage` with a
 * JSON mapper — nothing else in the codebase needs to change.
 */

const SEARCH_ENDPOINT = "https://jobs.bdjobs.com/jobsearch.asp";

/** Cuts the page into per-listing chunks around each job-detail link. */
function splitIntoCards(html: string): string[] {
  const cards: string[] = [];
  const linkPattern = /<a[^>]+href=["']([^"']*jobdetail[^"']*)["'][^>]*>/gi;

  let match: RegExpExecArray | null;
  while ((match = linkPattern.exec(html)) !== null) {
    // Grab a window of markup around the link — enough to hold the company
    // name, location and deadline that BDJobs renders next to the title.
    const start = Math.max(0, match.index - 400);
    const end = Math.min(html.length, match.index + 1600);
    cards.push(html.slice(start, end));
  }
  return cards;
}

function firstMatch(html: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const found = html.match(pattern);
    if (found?.[1]) {
      const text = stripHtml(found[1]);
      if (text) return text;
    }
  }
  return "";
}

function toRawJob(card: string): RawJob | null {
  const hrefMatch = card.match(/href=["']([^"']*jobdetail[^"']*)["']/i);
  if (!hrefMatch) return null;

  const href = hrefMatch[1].replace(/&amp;/g, "&");
  const url = href.startsWith("http")
    ? href
    : `https://jobs.bdjobs.com/${href.replace(/^\.?\//, "")}`;

  const title = firstMatch(card, [
    /class=["'][^"']*job-?title[^"']*["'][^>]*>([\s\S]{1,200}?)</i,
    /<a[^>]*jobdetail[^>]*>([\s\S]{1,200}?)<\/a>/i,
    /title=["']([^"']{4,150})["']/i,
  ]);
  if (!title) return null;

  const company =
    firstMatch(card, [
      /class=["'][^"']*(?:comp-?name|company)[^"']*["'][^>]*>([\s\S]{1,150}?)</i,
      /<span[^>]*>([^<]{3,80}(?:Ltd|Limited|Bank|Group|Inc|PLC)\.?)<\/span>/i,
    ]) || "Company on BDJobs";

  const location =
    firstMatch(card, [
      /class=["'][^"']*(?:locon|location)[^"']*["'][^>]*>([\s\S]{1,120}?)</i,
    ]) || "Bangladesh";

  const deadlineText = firstMatch(card, [
    /Deadline[^<]*<[^>]*>([^<]{4,40})</i,
    /Application Deadline[:\s]*([^<]{4,40})/i,
  ]);

  const idMatch = url.match(/id=([A-Za-z0-9]+)/i);
  const externalId = idMatch?.[1] ?? fingerprint(title, company, location);

  const blob = `${title} ${company} ${location}`;
  const jobType = detectJobType(blob);
  const description = truncate(
    `${title} — ${company}. Location: ${location}. Full requirements and application form are on the BDJobs listing.`,
  );

  return {
    source: "BDJOBS",
    externalId,
    url,
    title,
    company,
    companyLogo: null,
    location,
    isRemote: detectRemote(blob),
    jobType,
    experienceLevel: detectExperienceLevel(jobType, blob),
    description,
    skills: detectSkills(title, description),
    category: detectCategory(title, description),
    salaryText: null,
    minCgpa: detectMinCgpa(description),
    postedAt: new Date(),
    deadline: deadlineText ? parseDate(deadlineText) : null,
  };
}

export async function fetchBdJobs(query: ProviderQuery): Promise<ProviderResult> {
  if (process.env.BDJOBS_ENABLED !== "true") {
    return {
      source: "BDJOBS",
      jobs: [],
      ok: true,
      note: "BDJobs skipped — set BDJOBS_ENABLED=true in .env to attempt live fetching.",
    };
  }

  const keyword = query.keywords.slice(0, 2).join(" ") || "intern";
  const url = `${SEARCH_ENDPOINT}?txtsearch=${encodeURIComponent(keyword)}`;

  try {
    const response = await fetch(url, {
      headers: {
        // BDJobs serves a different page to clients without a browser UA.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      return {
        source: "BDJOBS",
        jobs: [],
        ok: false,
        note: `BDJobs returned ${response.status}.`,
      };
    }

    const html = await response.text();
    const seen = new Set<string>();
    const jobs: RawJob[] = [];

    for (const card of splitIntoCards(html)) {
      const job = toRawJob(card);
      if (!job || seen.has(job.externalId)) continue;
      seen.add(job.externalId);
      jobs.push(job);
      if (jobs.length >= query.limit) break;
    }

    return {
      source: "BDJOBS",
      jobs,
      ok: true,
      note: jobs.length
        ? `BDJobs returned ${jobs.length} listing${jobs.length === 1 ? "" : "s"}.`
        : "BDJobs page loaded but no listings could be parsed — their markup has likely changed.",
    };
  } catch (error) {
    console.error("[jobs] BDJobs fetch failed:", error);
    return {
      source: "BDJOBS",
      jobs: [],
      ok: false,
      note: "BDJobs request failed — network error or timeout.",
    };
  }
}
