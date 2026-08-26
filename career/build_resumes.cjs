// Generates ATS-optimized .docx resume variants from resume_data.json + variants.json.
// Single-column, no tables/text boxes/headers/graphics — everything a 2026 ATS parser reads cleanly.
const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle,
  LevelFormat, PositionalTab, PositionalTabAlignment, PositionalTabRelativeTo,
  PositionalTabLeader, convertInchesToTwip,
} = require('docx');

const data = JSON.parse(fs.readFileSync('resume_data.json', 'utf8'));
const variants = JSON.parse(fs.readFileSync('variants.json', 'utf8'));

const FONT = 'Calibri';
const BODY = 20;      // half-points => 10pt
const SMALL = 19;     // 9.5pt

const rightTab = () => new PositionalTab({
  alignment: PositionalTabAlignment.RIGHT,
  relativeTo: PositionalTabRelativeTo.MARGIN,
  leader: PositionalTabLeader.NONE,
});

const sectionHeading = (text) => new Paragraph({
  spacing: { before: 180, after: 80 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000', space: 2 } },
  children: [new TextRun({ text, bold: true, size: 21, font: FONT, characterSpacing: 20 })],
});

const bullet = (text) => new Paragraph({
  numbering: { reference: 'resume-bullets', level: 0 },
  spacing: { after: 20, line: 240 },
  children: [new TextRun({ text, size: BODY, font: FONT })],
});

function jobBlock(role, bullets) {
  const out = [new Paragraph({
    spacing: { before: 120, after: 0 },
    children: [
      new TextRun({ text: role.company, bold: true, size: BODY, font: FONT }),
      new TextRun({ text: `  |  ${role.location}`, size: BODY, font: FONT }),
      new TextRun({ children: [rightTab()], size: BODY, font: FONT }),
      new TextRun({ text: role.dates, bold: true, size: BODY, font: FONT }),
    ],
  })];
  out.push(new Paragraph({
    spacing: { after: 40 },
    children: [new TextRun({ text: role.title, italics: true, bold: true, size: BODY, font: FONT })],
  }));
  bullets.forEach((b) => out.push(bullet(b)));
  return out;
}

function build(key, v) {
  const kids = [];

  kids.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 0 },
    children: [new TextRun({ text: data.contact.name, bold: true, size: 40, font: FONT, characterSpacing: 30 })],
  }));
  kids.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 20 },
    children: [new TextRun({ text: v.headline, bold: true, size: SMALL, font: FONT, characterSpacing: 20 })],
  }));
  kids.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 0 },
    children: [new TextRun({ text: data.contact.line1, size: SMALL, font: FONT })],
  }));
  kids.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 40 },
    children: [new TextRun({ text: data.contact.line2, size: SMALL, font: FONT })],
  }));

  kids.push(sectionHeading('PROFESSIONAL SUMMARY'));
  kids.push(new Paragraph({
    spacing: { after: 40, line: 240 },
    children: [new TextRun({ text: v.summary, size: BODY, font: FONT })],
  }));

  kids.push(sectionHeading('CORE SKILLS'));
  v.skills.forEach(([label, items]) => {
    kids.push(new Paragraph({
      spacing: { after: 20, line: 240 },
      children: [
        new TextRun({ text: `${label}: `, bold: true, size: BODY, font: FONT }),
        new TextRun({ text: items, size: BODY, font: FONT }),
      ],
    }));
  });

  kids.push(sectionHeading('PROFESSIONAL EXPERIENCE'));
  v.order.forEach((rk) => {
    jobBlock(data.roles[rk], v.bullets[rk]).forEach((p) => kids.push(p));
  });

  if (v.projects && v.projects.length) {
    kids.push(sectionHeading('PROJECTS'));
    v.projects.forEach((pr) => {
      kids.push(new Paragraph({
        spacing: { before: 100, after: 0 },
        children: [
          new TextRun({ text: pr.name, bold: true, size: BODY, font: FONT }),
          new TextRun({ text: `  |  ${pr.sub}`, size: BODY, font: FONT }),
          new TextRun({ children: [rightTab()], size: BODY, font: FONT }),
          new TextRun({ text: pr.dates, bold: true, size: BODY, font: FONT }),
        ],
      }));
      pr.bullets.forEach((b) => kids.push(bullet(b)));
    });
  }

  kids.push(sectionHeading('EDUCATION & CERTIFICATIONS'));
  data.education.forEach((e) => {
    kids.push(new Paragraph({
      spacing: { before: 80, after: 0 },
      children: [
        new TextRun({ text: e.school, bold: true, size: BODY, font: FONT }),
        new TextRun({ text: `  |  ${e.detail} — ${e.sub}`, size: BODY, font: FONT }),
        new TextRun({ children: [rightTab()], size: BODY, font: FONT }),
        new TextRun({ text: e.dates, bold: true, size: BODY, font: FONT }),
      ],
    }));

  });

  return new Document({
    creator: 'Miles Tipton',
    title: `Miles Tipton — ${v.headline}`,
    numbering: {
      config: [{
        reference: 'resume-bullets',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: convertInchesToTwip(0.22), hanging: convertInchesToTwip(0.14) } } },
        }],
      }],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: {
            top: convertInchesToTwip(0.4), bottom: convertInchesToTwip(0.4),
            left: convertInchesToTwip(0.55), right: convertInchesToTwip(0.55),
          },
        },
      },
      children: kids,
    }],
  });
}

(async () => {
  fs.mkdirSync('resumes', { recursive: true });
  for (const [key, v] of Object.entries(variants)) {
    const doc = build(key, v);
    const buf = await Packer.toBuffer(doc);
    const out = `resumes/${v.file}.docx`;
    fs.writeFileSync(out, buf);
    console.log('wrote', out);
  }
})();
