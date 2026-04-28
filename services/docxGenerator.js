import {
  Document, Packer, Paragraph, TextRun,
  HeadingLevel, AlignmentType, BorderStyle
} from 'docx';
import fs from 'fs/promises';

function heading1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 60 }
  });
}

function heading2(text) {
  return new Paragraph({
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        size: 22,
        color: '1a1a1a'
      })
    ],
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: 'aaaaaa' }
    },
    spacing: { before: 200, after: 80 }
  });
}

function normalText(text, opts = {}) {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        size: opts.size || 20,
        bold: opts.bold || false,
        italics: opts.italic || false,
        color: opts.color || '333333'
      })
    ],
    spacing: { after: opts.spaceAfter || 40 }
  });
}

function bulletPoint(text) {
  return new Paragraph({
    children: [
      new TextRun({ text: `• ${text}`, size: 20, color: '333333' })
    ],
    indent: { left: 360 },
    spacing: { after: 40 }
  });
}

function divider() {
  return new Paragraph({
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: 'cccccc' }
    },
    spacing: { after: 60 }
  });
}

export async function generateDOCX(resumeData, outputPath) {
  const children = [];

  // Name
  children.push(new Paragraph({
    children: [
      new TextRun({
        text: resumeData.name || 'Your Name',
        bold: true,
        size: 40,
        color: '000000'
      })
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 }
  }));

  // Contact
  if (resumeData.contact) {
    children.push(new Paragraph({
      children: [
        new TextRun({ text: resumeData.contact, size: 18, color: '555555' })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 }
    }));
  }

  children.push(divider());

  // Summary
  if (resumeData.summary) {
    children.push(heading2('Summary'));
    children.push(normalText(resumeData.summary));
  }

  // Skills
  if (resumeData.skills?.length) {
    children.push(heading2('Skills'));
    children.push(normalText(resumeData.skills.join('  |  ')));
  }

  // Experience
  if (resumeData.experience?.length) {
    children.push(heading2('Experience'));
    resumeData.experience.forEach(exp => {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: exp.role, bold: true, size: 22, color: '000000' }),
          new TextRun({ text: `  —  ${exp.company}`, size: 22, color: '333333' })
        ],
        spacing: { after: 20 }
      }));
      children.push(normalText(exp.duration, { italic: true, color: '666666', size: 18 }));
      (exp.points || []).forEach(p => children.push(bulletPoint(p)));
      children.push(new Paragraph({ spacing: { after: 80 } }));
    });
  }

  // Projects
  if (resumeData.projects?.length) {
    children.push(heading2('Projects'));
    resumeData.projects.forEach(p => {
      children.push(normalText(p.name, { bold: true, size: 22 }));
      if (p.tech) children.push(normalText(p.tech, { italic: true, color: '666666', size: 18 }));
      children.push(normalText(p.description));
      children.push(new Paragraph({ spacing: { after: 80 } }));
    });
  }

  // Education
  if (resumeData.education) {
    children.push(heading2('Education'));
    children.push(normalText(resumeData.education));
  }

  // Certifications
  if (resumeData.certifications?.length) {
    children.push(heading2('Certifications'));
    resumeData.certifications.forEach(c => children.push(bulletPoint(c)));
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 20 }
        }
      }
    },
    sections: [{ children }]
  });

  const buffer = await Packer.toBuffer(doc);
  await fs.writeFile(outputPath, buffer);
  return outputPath;
}
