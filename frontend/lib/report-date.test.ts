import { describe, expect, it } from "vitest";
import { shiftReportDate } from "./report-date";
describe("report date navigation", () => {
  it("crosses month, leap-year and year boundaries", () => {
    expect(shiftReportDate("2024-03-01", -1)).toBe("2024-02-29");
    expect(shiftReportDate("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftReportDate("2026-01-01", -1)).toBe("2025-12-31");
  });
  it("uses calendar dates across daylight saving changes", () => {
    expect(shiftReportDate("2026-03-08", 1)).toBe("2026-03-09");
    expect(shiftReportDate("2026-11-01", -1)).toBe("2026-10-31");
    expect(shiftReportDate("", 1)).toBe("");
  });
});
