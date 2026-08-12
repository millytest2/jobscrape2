import { and, desc, eq } from "drizzle-orm";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { getDb } from "./db";
import { resumeDocuments } from "../drizzle/schema";

export const MAX_RESUME_SIZE_BYTES = 4 * 1024 * 1024;

export type ResumeEvidence = {
  summary: string;
  targetRoles: string[];
  skills: string[];
  locations: string[];
  yearsOfExperience?: number;
  achievements: string[];
};

const ROLE_TERMS = [
  "Sales Engineer", "Technical Sales Specialist", "Solutions Engineer", "Solution Engineer",
  "Pre-Sales Engineer", "PreSales Engineer", "Demo Engineer", "Technical Demo Engineer",
  "Technical Account Manager", "Customer Engineer", "Field Engineer", "Sales Development Engineer",
  "Data Scientist", "Applied Scientist", "Machine Learning Engineer", "Product Manager",
  "Research Scientist", "Computational Biologist", "ML Researcher", "Data Engineer",
  "Analytics Engineer", "Biostatistician", "Quantitative Researcher", "Software Engineer",
];

const SKILL_TERMS = [
  "Generative AI", "Conversational AI", "Machine Learning", "Causal Inference", "Statistical Analysis",
  "A/B Testing", "Randomized Testing", "Marketing Analytics", "Data Analysis", "Power BI",
  "Databricks", "Tableau", "Python", "R", "SQL", "React", "Django", "TypeScript",
  "REST APIs", "GraphQL", "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Git",
  "Product Demos", "Proof of Concept", "Technical Documentation", "Technical Training",
  "Outbound Sales", "Lead Generation", "HubSpot", "Salesforce", "Apollo.io", "SEO",
  "Copywriting", "Customer Pain Point Analysis", "Stakeholder Management", "Communication",
  "Cross-functional Collaboration", "Executive Presentations", "Problem Solving",
];

const LOCATION_PATTERN = /\b([A-Z][a-zA-Z .'-]+,\s*(?:AL|AK|AZ|AR|CA|CO|CT|DC|DE|FL|GA|HI|IA|ID|IL|IN|KS|KY|LA|MA|MD|ME|MI|MN|MO|MS|MT|NC|ND|NE|NH|NJ|NM|NV|NY|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VA|VT|WA|WI|WV|WY))\b/g;

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter(value => {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function containsTerm(text: string, term: string): boolean {
  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Short skills such as "R" must match as standalone terms, not letters inside
  // unrelated words such as "organized" or "community".
  if (term.length <= 2) {
    return new RegExp(`\\b${escapedTerm}\\b`, "i").test(text);
  }
  return text.toLowerCase().includes(term.toLowerCase());
}

function getFileKind(fileName: string, mimeType: string): "pdf" | "docx" {
  const normalizedName = fileName.toLowerCase();
  const normalizedType = mimeType.toLowerCase();
  if (normalizedName.endsWith(".pdf") || normalizedType === "application/pdf") return "pdf";
  if (
    normalizedName.endsWith(".docx") ||
    normalizedType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) return "docx";
  throw new Error("Only PDF and DOCX resumes are supported.");
}

export function validateResumeFile(input: {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}): "pdf" | "docx" {
  if (!input.fileName.trim()) throw new Error("A resume file name is required.");
  if (input.buffer.length === 0) throw new Error("The uploaded resume is empty.");
  if (input.buffer.length > MAX_RESUME_SIZE_BYTES) {
    throw new Error("Resume files must be 4 MB or smaller.");
  }

  const kind = getFileKind(input.fileName, input.mimeType);
  const pdfSignature = input.buffer.subarray(0, 5).toString("utf8") === "%PDF-";
  const docxSignature = input.buffer.subarray(0, 2).toString("utf8") === "PK";
  if ((kind === "pdf" && !pdfSignature) || (kind === "docx" && !docxSignature)) {
    throw new Error("The file contents do not match the selected resume format.");
  }
  return kind;
}

export async function extractResumeText(kind: "pdf" | "docx", buffer: Buffer): Promise<string> {
  if (kind === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

export function extractResumeEvidence(rawText: string): ResumeEvidence {
  const text = rawText.replace(/\u0000/g, " ").replace(/\r/g, "");
  const compactText = text.replace(/\s+/g, " ").trim();
  const lines = text
    .split(/\n+/)
    .map(line => line.replace(/\s+/g, " ").trim())
    .filter(line => line.length >= 12);

  const targetRoles = ROLE_TERMS.filter(term => containsTerm(compactText, term));
  const skills = SKILL_TERMS.filter(term => containsTerm(compactText, term));
  const locations = unique(Array.from(text.matchAll(LOCATION_PATTERN)).map(match => match[1]));

  const years = Array.from(compactText.matchAll(/\b(\d{1,2})\+?\s+years?(?:\s+of)?\s+(?:experience|work|professional)/gi))
    .map(match => Number.parseInt(match[1], 10))
    .filter(year => Number.isFinite(year) && year <= 50);

  const achievementPattern = /(\d|%|\$|increased|improved|reduced|generated|drove|created|built|launched|automated|supported)/i;
  const achievements = lines
    .filter(line => achievementPattern.test(line))
    .filter(line => line.length <= 360)
    .slice(0, 12);

  return {
    summary: compactText.slice(0, 650),
    targetRoles: unique(targetRoles),
    skills: unique(skills),
    locations,
    yearsOfExperience: years.length > 0 ? Math.max(...years) : undefined,
    achievements: unique(achievements),
  };
}

export function parseStoredResumeEvidence(serialized: string | null): ResumeEvidence | null {
  if (!serialized) return null;
  try {
    return JSON.parse(serialized) as ResumeEvidence;
  } catch {
    return null;
  }
}

export async function getActiveResumeEvidence(userId: number, profileName: string): Promise<ResumeEvidence | null> {
  const db = await getDb();
  if (!db) return null;
  const records = await db
    .select({ extractedData: resumeDocuments.extractedData })
    .from(resumeDocuments)
    .where(and(
      eq(resumeDocuments.userId, userId),
      eq(resumeDocuments.profileName, profileName),
      eq(resumeDocuments.isActive, true),
      eq(resumeDocuments.parseStatus, "ready"),
    ))
    .orderBy(desc(resumeDocuments.updatedAt))
    .limit(1);
  return records[0] ? parseStoredResumeEvidence(records[0].extractedData) : null;
}
