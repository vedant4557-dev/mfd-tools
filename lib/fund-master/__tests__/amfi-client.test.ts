import { parseAMFINavAll, normalizeSchemeName } from "@/lib/fund-master/amfi-client";

describe("parseAMFINavAll", () => {
  it("parses a simple NAVAll-style file with AMC and category headers", () => {
    const raw = `
Open Ended Schemes(Equity Scheme - Large Cap Fund)

Axis Mutual Fund

120503;INF846K01EW2;-;Axis Bluechip Fund - Direct Plan - Growth;55.1234;12-Jun-2026
120504;INF846K01EX0;-;Axis Bluechip Fund - Regular Plan - Growth;51.7890;12-Jun-2026

Open Ended Schemes(Debt Scheme - Liquid Fund)

HDFC Mutual Fund

100001;INF179K01AB1;-;HDFC Liquid Fund - Direct Plan - Growth;4500.1234;12-Jun-2026
`.trim();

    const result = parseAMFINavAll(raw);

    expect(result).toHaveLength(3);

    expect(result[0]).toMatchObject({
      amfiCode: "120503",
      isin1: "INF846K01EW2",
      isin2: null,
      schemeName: "Axis Bluechip Fund - Direct Plan - Growth",
      nav: 55.1234,
      navDate: "2026-06-12",
      amcName: "Axis Mutual Fund",
    });
    expect(result[0].category).toMatch(/Equity/);
    expect(result[0].assetClass).toBe("EQUITY");

    expect(result[2]).toMatchObject({
      amfiCode: "100001",
      amcName: "HDFC Mutual Fund",
    });
    expect(result[2].category).toMatch(/Debt/);
    expect(result[2].assetClass).toBe("DEBT");
  });

  it("returns empty array for empty input", () => {
    expect(parseAMFINavAll("")).toEqual([]);
  });

  it("ignores blank lines and non-data lines gracefully", () => {
    const raw = `


Open Ended Schemes(Equity Scheme - Mid Cap Fund)


SBI Mutual Fund


145552;INF200K01RA8;-;SBI Magnum Midcap Fund - Direct Plan - Growth;225.5;12-Jun-2026

`.trim();

    const result = parseAMFINavAll(raw);
    expect(result).toHaveLength(1);
    expect(result[0].amfiCode).toBe("145552");
  });

  it("handles ISIN as '-' (no ISIN) by setting null", () => {
    const raw = `
Open Ended Schemes(Equity Scheme - Small Cap Fund)
Some AMC
99999;-;-;Some New Fund - Growth;10.0000;12-Jun-2026
`.trim();

    const result = parseAMFINavAll(raw);
    expect(result[0].isin1).toBeNull();
    expect(result[0].isin2).toBeNull();
  });

  it("handles missing/invalid NAV gracefully", () => {
    const raw = `
Open Ended Schemes(Equity Scheme - Large Cap Fund)
Some AMC
88888;INF000K01AA1;-;Some Fund - Growth;N.A.;12-Jun-2026
`.trim();

    const result = parseAMFINavAll(raw);
    expect(result[0].nav).toBeNull();
  });

  it("does not misidentify a scheme name containing a dash as a category header", () => {
    const raw = `
Open Ended Schemes(Equity Scheme - Large Cap Fund)
Some AMC
77777;INF111K01BB2;-;Some Fund - Direct Plan (IDCW) - Growth;100.00;12-Jun-2026
`.trim();

    const result = parseAMFINavAll(raw);
    expect(result).toHaveLength(1);
    expect(result[0].schemeName).toContain("Some Fund - Direct Plan (IDCW) - Growth");
  });
});

describe("normalizeSchemeName", () => {
  it("lowercases and collapses whitespace", () => {
    expect(normalizeSchemeName("  Axis  Bluechip   Fund ")).toBe("axis bluechip fund");
  });

  it("removes special characters", () => {
    expect(normalizeSchemeName("HDFC Liquid Fund - Direct Plan (Growth)")).toBe(
      "hdfc liquid fund direct plan growth"
    );
  });

  it("treats differently-cased/spaced names as equal", () => {
    expect(normalizeSchemeName("ICICI Prudential Bluechip Fund")).toBe(
      normalizeSchemeName("icici   prudential    bluechip fund")
    );
  });
});
