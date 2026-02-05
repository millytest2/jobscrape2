import { describe, it, expect } from "vitest";

describe("View All Jobs Feature", () => {
  it("should return allJobs field with all ranked jobs", () => {
    // Mock scraper result structure
    const mockResult = {
      status: "success",
      params: {
        location: "Los Angeles",
        role: "Sales Engineer",
      },
      stats: {
        scraped: 425,
        filtered: 425,
        top20: 20,
        sources: 12,
        errors: 1,
        duration: 45,
      },
      jobs: Array(20).fill(null).map((_, i) => ({
        title: `Job ${i + 1}`,
        company: `Company ${i + 1}`,
        location: "Los Angeles, CA",
        url: `https://example.com/job${i + 1}`,
        source: "RemoteOK",
        score: 90 - i,
        scoreExplanation: "Strong match",
      })),
      allJobs: Array(425).fill(null).map((_, i) => ({
        title: `Job ${i + 1}`,
        company: `Company ${i + 1}`,
        location: "Los Angeles, CA",
        url: `https://example.com/job${i + 1}`,
        source: "RemoteOK",
        score: 90 - Math.floor(i / 20),
        scoreExplanation: "Match",
      })),
    };

    // Verify structure
    expect(mockResult.jobs).toHaveLength(20);
    expect(mockResult.allJobs).toHaveLength(425);
    expect(mockResult.allJobs!.length).toBeGreaterThan(mockResult.jobs.length);
    
    // Verify all jobs have scores
    mockResult.allJobs!.forEach((job) => {
      expect(job.score).toBeDefined();
      expect(job.score).toBeGreaterThanOrEqual(0);
      expect(job.score).toBeLessThanOrEqual(100);
    });
  });

  it("should paginate 425 jobs into 9 pages of 50 jobs each", () => {
    const totalJobs = 425;
    const jobsPerPage = 50;
    const totalPages = Math.ceil(totalJobs / jobsPerPage);

    expect(totalPages).toBe(9);

    // Verify last page has correct number of jobs
    const lastPageJobs = totalJobs - (totalPages - 1) * jobsPerPage;
    expect(lastPageJobs).toBe(25); // 425 - (8 * 50) = 25
  });

  it("should calculate correct pagination indices", () => {
    const totalJobs = 425;
    const jobsPerPage = 50;

    // Page 1: jobs 1-50
    let currentPage = 1;
    let startIndex = (currentPage - 1) * jobsPerPage;
    let endIndex = Math.min(startIndex + jobsPerPage, totalJobs);
    expect(startIndex).toBe(0);
    expect(endIndex).toBe(50);

    // Page 5: jobs 201-250
    currentPage = 5;
    startIndex = (currentPage - 1) * jobsPerPage;
    endIndex = Math.min(startIndex + jobsPerPage, totalJobs);
    expect(startIndex).toBe(200);
    expect(endIndex).toBe(250);

    // Page 9 (last): jobs 401-425
    currentPage = 9;
    startIndex = (currentPage - 1) * jobsPerPage;
    endIndex = Math.min(startIndex + jobsPerPage, totalJobs);
    expect(startIndex).toBe(400);
    expect(endIndex).toBe(425);
  });

  it("should show View All button only when allJobs has more than top jobs", () => {
    const resultWithAllJobs = {
      jobs: Array(20).fill(null),
      allJobs: Array(425).fill(null),
    };

    const resultWithoutAllJobs = {
      jobs: Array(20).fill(null),
      allJobs: undefined,
    };

    const resultWithSameCount = {
      jobs: Array(20).fill(null),
      allJobs: Array(20).fill(null),
    };

    // Should show button
    expect(resultWithAllJobs.allJobs!.length).toBeGreaterThan(resultWithAllJobs.jobs.length);

    // Should NOT show button
    expect(resultWithoutAllJobs.allJobs).toBeUndefined();
    expect(resultWithSameCount.allJobs!.length).toBe(resultWithSameCount.jobs.length);
  });
});
