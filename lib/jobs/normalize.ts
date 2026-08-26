import type {
  ExperienceLevel,
  JobCategory,
  JobType,
} from "./types";

/**
 * Skill vocabulary. Job posts rarely publish a clean skills array, so we mine
 * the title + description for known terms. `aliases` catches the spellings
 * employers actually use ("Node JS", "node.js", "NodeJS").
 */
const SKILL_DICTIONARY: { skill: string; aliases: string[] }[] = [
  { skill: "JavaScript", aliases: ["javascript", "js ", "es6"] },
  { skill: "TypeScript", aliases: ["typescript", "ts "] },
  { skill: "React", aliases: ["react", "react.js", "reactjs"] },
  { skill: "Next.js", aliases: ["next.js", "nextjs", "next js"] },
  { skill: "Node.js", aliases: ["node.js", "nodejs", "node js"] },
  { skill: "Python", aliases: ["python", "django", "flask"] },
  { skill: "Java", aliases: ["java ", "spring boot", "springboot"] },
  { skill: "C++", aliases: ["c++", "cpp"] },
  { skill: "C#", aliases: ["c#", ".net", "dotnet"] },
  { skill: "PHP", aliases: ["php", "laravel", "codeigniter"] },
  { skill: "SQL", aliases: ["sql", "mysql", "postgres", "postgresql", "oracle"] },
  { skill: "MongoDB", aliases: ["mongodb", "mongo"] },
  { skill: "Machine Learning", aliases: ["machine learning", "ml ", "deep learning"] },
  { skill: "Data Analysis", aliases: ["data analysis", "data analytics", "analytics"] },
  { skill: "Power BI", aliases: ["power bi", "powerbi", "tableau"] },
  { skill: "Excel", aliases: ["excel", "spreadsheet", "vlookup"] },
  { skill: "Figma", aliases: ["figma", "ui/ux", "ux design", "ui design"] },
  { skill: "Flutter", aliases: ["flutter", "dart"] },
  { skill: "Android", aliases: ["android", "kotlin"] },
  { skill: "iOS", aliases: ["ios", "swift"] },
  { skill: "Docker", aliases: ["docker", "kubernetes", "k8s"] },
  { skill: "AWS", aliases: ["aws", "amazon web services", "azure", "gcp"] },
  { skill: "Git", aliases: ["git", "github", "gitlab", "version control"] },
  { skill: "Networking", aliases: ["ccna", "networking", "cisco", "routing"] },
  { skill: "Embedded Systems", aliases: ["embedded", "microcontroller", "arduino", "pcb", "vlsi"] },
  { skill: "MATLAB", aliases: ["matlab", "simulink"] },
  { skill: "AutoCAD", aliases: ["autocad", "solidworks"] },
  { skill: "Accounting", aliases: ["accounting", "bookkeeping", "tally"] },
  { skill: "Financial Analysis", aliases: ["financial analysis", "financial model", "valuation"] },
  { skill: "Digital Marketing", aliases: ["digital marketing", "seo", "sem", "google ads"] },
  { skill: "Content Writing", aliases: ["content writing", "copywriting", "content creation"] },
  { skill: "Social Media", aliases: ["social media", "facebook page", "instagram marketing"] },
  { skill: "Sales", aliases: ["sales", "business development", "lead generation"] },
  { skill: "HR", aliases: ["human resource", "recruitment", "talent acquisition"] },
  { skill: "Communication", aliases: ["communication skill", "interpersonal"] },
  { skill: "Teamwork", aliases: ["teamwork", "team player", "collaborat"] },
];

/** Removes HTML tags and collapses whitespace from scraped descriptions. */
export function stripHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|div|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function truncate(input: string, max = 4000): string {
  return input.length > max ? `${input.slice(0, max)}…` : input;
}

/** Pulls known skills out of free text. Order is stable so UI lists look calm. */
export function detectSkills(...texts: (string | null | undefined)[]): string[] {
  const haystack = ` ${texts.filter(Boolean).join(" ").toLowerCase()} `;
  const found: string[] = [];

  for (const entry of SKILL_DICTIONARY) {
    if (entry.aliases.some((alias) => haystack.includes(alias))) {
      found.push(entry.skill);
    }
  }
  return found;
}

export function detectJobType(...texts: (string | null | undefined)[]): JobType {
  const text = texts.filter(Boolean).join(" ").toLowerCase();

  if (/\bintern(ship)?\b|\btrainee\b|\bindustrial attachment\b/.test(text)) {
    return "INTERNSHIP";
  }
  if (/\bpart[- ]time\b/.test(text)) return "PART_TIME";
  if (/\bcontract(ual)?\b|\bfreelance\b|\bconsultant\b/.test(text)) return "CONTRACT";
  return "FULL_TIME";
}

export function detectExperienceLevel(
  jobType: JobType,
  ...texts: (string | null | undefined)[]
): ExperienceLevel {
  const text = texts.filter(Boolean).join(" ").toLowerCase();

  if (jobType === "INTERNSHIP") return "INTERN";
  if (/\b(senior|lead|principal|head of|manager|architect)\b/.test(text)) return "SENIOR";
  if (/\b([3-9]|1[0-9])\+?\s*(years?|yrs?)\b/.test(text)) return "MID";
  if (/\b(mid[- ]level|2\+?\s*years?)\b/.test(text)) return "MID";
  return "ENTRY";
}

export function detectCategory(
  ...texts: (string | null | undefined)[]
): JobCategory {
  const text = texts.filter(Boolean).join(" ").toLowerCase();

  const rules: [JobCategory, RegExp][] = [
    ["DATA", /\b(data scien|data analy|machine learning|\bai\b|business intelligence|nlp)\b/],
    ["SOFTWARE", /\b(software|developer|programmer|engineer.*(web|mobile|backend|frontend)|full[- ]stack|qa engineer|devops)\b/],
    ["HARDWARE", /\b(electrical|electronic|embedded|hardware|telecom|power system|vlsi|network engineer)\b/],
    ["FINANCE", /\b(finance|accounting|audit|banking|investment|treasury)\b/],
    ["MARKETING", /\b(marketing|brand|social media|content|seo|advertis)\b/],
    ["BUSINESS", /\b(business|management trainee|operations|supply chain|hr|human resource|admin)\b/],
  ];

  for (const [category, pattern] of rules) {
    if (pattern.test(text)) return category;
  }
  return "GENERAL";
}

/** Finds an explicit CGPA bar such as "minimum CGPA of 3.00" in the post. */
export function detectMinCgpa(...texts: (string | null | undefined)[]): number | null {
  const text = texts.filter(Boolean).join(" ").toLowerCase();
  const match = text.match(/(?:cgpa|gpa)[^0-9]{0,20}([0-4](?:\.\d{1,2})?)/);

  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 && value <= 4 ? value : null;
}

export function detectRemote(...texts: (string | null | undefined)[]): boolean {
  const text = texts.filter(Boolean).join(" ").toLowerCase();
  return /\b(remote|work from home|wfh|hybrid)\b/.test(text);
}

/** Best-effort date parsing; falls back to "now" so sorting never breaks. */
export function parseDate(value: unknown): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if (typeof value === "number") {
    const fromNumber = new Date(value > 1e12 ? value : value * 1000);
    if (!Number.isNaN(fromNumber.getTime())) return fromNumber;
  }

  if (typeof value === "string" && value.trim()) {
    const direct = new Date(value);
    if (!Number.isNaN(direct.getTime())) return direct;

    // Relative strings LinkedIn scrapers often return: "3 days ago"
    const relative = value.toLowerCase().match(/(\d+)\s*(minute|hour|day|week|month)/);
    if (relative) {
      const amount = Number(relative[1]);
      const unitMs: Record<string, number> = {
        minute: 60_000,
        hour: 3_600_000,
        day: 86_400_000,
        week: 604_800_000,
        month: 2_592_000_000,
      };
      return new Date(Date.now() - amount * (unitMs[relative[2]] ?? 0));
    }
  }

  return new Date();
}

/** Stable id when a source gives us nothing usable. */
export function fingerprint(title: string, company: string, location: string): string {
  const base = `${title}|${company}|${location}`.toLowerCase().replace(/\s+/g, "-");
  let hash = 0;
  for (let i = 0; i < base.length; i += 1) {
    hash = (hash << 5) - hash + base.charCodeAt(i);
    hash |= 0;
  }
  return `fp-${Math.abs(hash).toString(36)}`;
}
