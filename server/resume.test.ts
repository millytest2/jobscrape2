import { describe, expect, it } from "vitest";
import { extractResumeEvidence, validateResumeFile } from "./resume";
import { rankJobs } from "./scrapers/filter";

describe("resume evidence extraction", () => {
  it("extracts reusable roles, skills, locations, experience, and quantified achievements", () => {
    const evidence = extractResumeEvidence(`
      Jane Candidate | Los Angeles, CA
      Sales Engineer with 4 years of experience in SaaS.
      Built Generative AI product demos and REST APIs for enterprise customers.
      Increased qualified pipeline by 35% using HubSpot and Python automation.
    `);

    expect(evidence.targetRoles).toContain("Sales Engineer");
    expect(evidence.skills).toEqual(expect.arrayContaining(["Generative AI", "Product Demos", "REST APIs", "HubSpot", "Python"]));
    expect(evidence.locations).toContain("Los Angeles, CA");
    expect(evidence.yearsOfExperience).toBe(4);
    expect(evidence.achievements.some(item => item.includes("35%"))).toBe(true);
  });

  it("validates both file extension and file signature before parsing", () => {
    expect(validateResumeFile({
      fileName: "resume.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer: Buffer.from("PK\u0003\u0004test document"),
    })).toBe("docx");

    expect(() => validateResumeFile({
      fileName: "resume.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("not a PDF"),
    })).toThrow("file contents do not match");
  });

  it("does not invent unrelated roles or skills from resume text", () => {
    const evidence = extractResumeEvidence("Organized community events and supported volunteers.");
    expect(evidence.targetRoles).toEqual([]);
    expect(evidence.skills).toEqual([]);
  });

  it("keeps an explicitly targeted technical role eligible for ranking", () => {
    const ranked = rankJobs([
      {
        title: "Data Scientist",
        company: "Google",
        location: "Remote, US",
        url: "https://careers.google.com/example",
        source: "Career site",
        description: "Use Python, SQL, machine learning, and statistical analysis to improve product decisions. Requires 5 years of experience.",
      },
    ], {
      targetRoles: ["Data Scientist"],
      targetLocation: "New York, NY",
      maxExperienceYears: 7,
      missionDrivenKeywords: ["machine learning"],
      skills: { technical: ["Python", "SQL", "Machine Learning"] },
    }, 20);

    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.title).toBe("Data Scientist");
  });
});
