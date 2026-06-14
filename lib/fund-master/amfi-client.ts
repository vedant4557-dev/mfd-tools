import { mapCategoryToAssetClass } from "@/lib/analytics/constants";
import type { AssetClass } from "@prisma/client";

const AMFI_NAV_ALL_URL = "https://www.amfiindia.com/spages/NAVAll.txt";

export interface AMFISchemeRecord {
  amfiCode: string;
  isin1: string | null;
  isin2: string | null;
  schemeName: string;
  nav: number | null;
  navDate: string | null; // ISO date
  amcName: string;
  category: string;
  assetClass: AssetClass;
}

/**
 * AMFI's NAVAll.txt format (pipe-delimited, semi-structured):
 *
 *   Scheme Code;ISIN Div Payout/ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date
 *
 * Interspersed with section header lines that announce the AMC name and
 * fund category, e.g.:
 *   "Axis Mutual Fund"
 *   "Open Ended Schemes(Equity Scheme - Large Cap Fund)"
 *
 * This parser walks the file line-by-line, tracking the current AMC name
 * and category from header lines, and emits a record for every data row.
 */
export function parseAMFINavAll(raw: string): AMFISchemeRecord[] {
  const lines = raw.split(/\r?\n/);
  const records: AMFISchemeRecord[] = [];

  let currentAMC = "";
  let currentCategory = "";

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Data rows contain semicolons with at least 5 fields and start with digits (scheme code)
    if (line.includes(";")) {
      const parts = line.split(";");
      if (parts.length >= 5 && /^\d+$/.test(parts[0].trim())) {
        const [amfiCode, isin1, isin2, schemeName, navStr, dateStr] = parts;
        const nav = parseFloat(navStr);
        records.push({
          amfiCode: amfiCode.trim(),
          isin1: cleanISIN(isin1),
          isin2: cleanISIN(isin2),
          schemeName: schemeName.trim(),
          nav: Number.isFinite(nav) ? nav : null,
          navDate: dateStr ? parseAMFIDate(dateStr.trim()) : null,
          amcName: currentAMC,
          category: currentCategory,
          assetClass: mapCategoryToAssetClass(currentCategory),
        });
        continue;
      }
    }

    // Category header lines look like: "Open Ended Schemes(Equity Scheme - Large Cap Fund)"
    const categoryMatch = line.match(/\((.+)\)/);
    if (categoryMatch && /scheme/i.test(line)) {
      currentCategory = normalizeAMFICategory(categoryMatch[1]);
      continue;
    }

    // Anything else with no semicolons and not a category header is an AMC name line
    if (!line.includes(";")) {
      currentAMC = line;
    }
  }

  return records;
}

/**
 * Normalizes AMFI's verbose category strings (e.g. "Equity Scheme - Large Cap Fund")
 * to the shorter "AssetClass - SubCategory" form used by lib/analytics/constants.ts
 * (e.g. "Equity - Large Cap").
 */
function normalizeAMFICategory(raw: string): string {
  let s = raw.trim();
  s = s.replace(/\s*Scheme\s*/i, " ");
  s = s.replace(/\s*Fund\s*$/i, "");
  s = s.replace(/\s+/g, " ").trim();
  // "Equity - Large Cap Fund" style -> ensure "AssetClass - SubCategory"
  if (!s.includes("-")) {
    s = s.replace(/^(\S+)\s+/, "$1 - ");
  }
  return s;
}

function cleanISIN(s: string): string | null {
  const trimmed = s.trim();
  return trimmed && trimmed !== "-" ? trimmed : null;
}

/** AMFI date format: "12-Jun-2026" */
function parseAMFIDate(s: string): string | null {
  const match = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (!match) return null;
  const months: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  const [, day, mon, year] = match;
  const month = months[mon];
  if (!month) return null;
  return `${year}-${month}-${day.padStart(2, "0")}`;
}

/**
 * Fetches the current AMFI NAVAll.txt and returns parsed scheme records.
 * Throws on network failure — caller (sync worker) should handle retries/logging.
 */
export async function fetchAMFISchemeMaster(): Promise<AMFISchemeRecord[]> {
  const res = await fetch(AMFI_NAV_ALL_URL);
  if (!res.ok) {
    throw new Error(`AMFI NAVAll fetch failed: ${res.status}`);
  }
  const text = await res.text();
  return parseAMFINavAll(text);
}

export function normalizeSchemeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
