import PDFDocument from 'pdfkit';
import fs from 'fs';

// ── Shared helpers ────────────────────────────────────────────────────────────

function sectionHeader(doc, title, opts = {}) {
  const { color = '#1a1a1a', lineColor = '#cccccc' } = opts;
  doc.moveDown(0.6);
  doc.fontSize(12).fillColor(color).font('Helvetica-Bold').text(title.toUpperCase());
  doc
    .moveTo(doc.page.margins.left, doc.y + 2)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y + 2)
    .strokeColor(lineColor)
    .lineWidth(0.5)
    .stroke();
  doc.moveDown(0.3);
}

function bullet(doc, text, indent = 20) {
  const x = doc.page.margins.left + indent;
  const w = doc.page.width - doc.page.margins.left - doc.page.margins.right - indent;
  doc.fontSize(10).fillColor('#333333').font('Helvetica')
    .text(`• ${text}`, x, doc.y, { width: w });
}

// ── Template: ATS Simple ──────────────────────────────────────────────────────

function buildATS(doc, data) {
  const m = doc.page.margins.left;
  const w = doc.page.width - m - doc.page.margins.right;

  // Name
  doc.fontSize(20).font('Helvetica-Bold').fillColor('#000000').text(data.name || 'Your Name', { align: 'center' });
  doc.moveDown(0.2);

  // Contact
  doc.fontSize(9).font('Helvetica').fillColor('#444444').text(data.contact || '', { align: 'center' });
  doc.moveDown(0.3);

  // Divider
  doc.moveTo(m, doc.y).lineTo(m + w, doc.y).strokeColor('#000').lineWidth(1).stroke();
  doc.moveDown(0.4);

  // Summary
  if (data.summary) {
    sectionHeader(doc, 'Summary');
    doc.fontSize(10).fillColor('#333').font('Helvetica').text(data.summary, { width: w });
  }

  // Skills
  if (data.skills?.length) {
    sectionHeader(doc, 'Skills');
    doc.fontSize(10).fillColor('#333').font('Helvetica')
      .text(data.skills.join(' | '), { width: w });
  }

  // Experience
  if (data.experience?.length) {
    sectionHeader(doc, 'Experience');
    data.experience.forEach(exp => {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#000')
        .text(`${exp.role}  —  ${exp.company}`);
      doc.fontSize(9).font('Helvetica-Oblique').fillColor('#555')
        .text(exp.duration);
      doc.moveDown(0.2);
      (exp.points || []).forEach(p => bullet(doc, p));
      doc.moveDown(0.3);
    });
  }

  // Projects
  if (data.projects?.length) {
    sectionHeader(doc, 'Projects');
    data.projects.forEach(p => {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#000').text(p.name);
      if (p.tech) doc.fontSize(9).font('Helvetica-Oblique').fillColor('#555').text(p.tech);
      doc.fontSize(10).font('Helvetica').fillColor('#333').text(p.description, { width: w });
      doc.moveDown(0.3);
    });
  }

  // Education
  if (data.education) {
    sectionHeader(doc, 'Education');
    doc.fontSize(10).font('Helvetica').fillColor('#333').text(data.education, { width: w });
  }

  // Certifications
  if (data.certifications?.length) {
    sectionHeader(doc, 'Certifications');
    data.certifications.forEach(c => bullet(doc, c));
  }
}

// ── Template: Modern ─────────────────────────────────────────────────────────

function buildModern(doc, data) {
  const ACCENT = '#2563eb';
  const m = doc.page.margins.left;
  const w = doc.page.width - m - doc.page.margins.right;

  // Header band
  doc.rect(0, 0, doc.page.width, 100).fill(ACCENT);

  doc.fontSize(24).font('Helvetica-Bold').fillColor('#ffffff')
    .text(data.name || 'Your Name', m, 25, { width: w });
  doc.fontSize(10).font('Helvetica').fillColor('#dbeafe')
    .text(data.contact || '', m, 58, { width: w });

  doc.y = 115;

  const sectionMod = (title) => {
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica-Bold').fillColor(ACCENT).text(title.toUpperCase());
    doc.moveTo(m, doc.y + 2).lineTo(m + w, doc.y + 2)
      .strokeColor(ACCENT).lineWidth(1).stroke();
    doc.moveDown(0.4);
  };

  if (data.summary) {
    sectionMod('Professional Summary');
    doc.fontSize(10).font('Helvetica').fillColor('#1e293b').text(data.summary, { width: w });
  }

  if (data.skills?.length) {
    sectionMod('Core Skills');
    const skillLine = data.skills.join('  ·  ');
    doc.fontSize(10).font('Helvetica').fillColor('#1e293b').text(skillLine, { width: w });
  }

  if (data.experience?.length) {
    sectionMod('Experience');
    data.experience.forEach(exp => {
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text(exp.role);
      doc.fontSize(10).font('Helvetica').fillColor(ACCENT).text(`${exp.company}  |  ${exp.duration}`);
      doc.moveDown(0.2);
      (exp.points || []).forEach(p => {
        doc.fontSize(10).font('Helvetica').fillColor('#334155')
          .text(`▸  ${p}`, m + 10, doc.y, { width: w - 10 });
      });
      doc.moveDown(0.4);
    });
  }

  if (data.projects?.length) {
    sectionMod('Projects');
    data.projects.forEach(p => {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text(p.name);
      if (p.tech) {
        doc.fontSize(9).font('Helvetica').fillColor(ACCENT).text(p.tech);
      }
      doc.fontSize(10).font('Helvetica').fillColor('#334155').text(p.description, { width: w });
      doc.moveDown(0.3);
    });
  }

  if (data.education) {
    sectionMod('Education');
    doc.fontSize(10).font('Helvetica').fillColor('#1e293b').text(data.education, { width: w });
  }

  if (data.certifications?.length) {
    sectionMod('Certifications');
    data.certifications.forEach(c => {
      doc.fontSize(10).font('Helvetica').fillColor('#334155').text(`▸  ${c}`, m + 10, doc.y, { width: w - 10 });
    });
  }
}

// ── Template: Compact ─────────────────────────────────────────────────────────

function buildCompact(doc, data) {
  const m = doc.page.margins.left;
  const w = doc.page.width - m - doc.page.margins.right;

  // Name + contact on one line
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#000').text(data.name || 'Your Name');
  doc.fontSize(8).font('Helvetica').fillColor('#444').text(data.contact || '');
  doc.moveTo(m, doc.y + 3).lineTo(m + w, doc.y + 3).strokeColor('#000').lineWidth(0.8).stroke();
  doc.moveDown(0.3);

  const sectionCompact = (title) => {
    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#000').text(title.toUpperCase());
    doc.moveTo(m, doc.y + 1).lineTo(m + w, doc.y + 1)
      .strokeColor('#888').lineWidth(0.4).stroke();
    doc.moveDown(0.2);
  };

  if (data.summary) {
    sectionCompact('Summary');
    doc.fontSize(8.5).font('Helvetica').fillColor('#222').text(data.summary, { width: w });
  }

  if (data.skills?.length) {
    sectionCompact('Skills');
    doc.fontSize(8.5).font('Helvetica').fillColor('#222')
      .text(data.skills.join(', '), { width: w });
  }

  if (data.experience?.length) {
    sectionCompact('Experience');
    data.experience.forEach(exp => {
      doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#000')
        .text(`${exp.role}  —  ${exp.company}`, { continued: true })
        .font('Helvetica').fontSize(8).fillColor('#555')
        .text(`   ${exp.duration}`);
      (exp.points || []).forEach(p => {
        doc.fontSize(8.5).font('Helvetica').fillColor('#222')
          .text(`• ${p}`, m + 10, doc.y, { width: w - 10 });
      });
      doc.moveDown(0.2);
    });
  }

  if (data.projects?.length) {
    sectionCompact('Projects');
    data.projects.forEach(p => {
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#000').text(p.name, { continued: !!p.tech });
      if (p.tech) doc.fontSize(8).font('Helvetica').fillColor('#555').text(`  [${p.tech}]`);
      doc.fontSize(8.5).font('Helvetica').fillColor('#222').text(p.description, { width: w });
      doc.moveDown(0.15);
    });
  }

  if (data.education) {
    sectionCompact('Education');
    doc.fontSize(8.5).font('Helvetica').fillColor('#222').text(data.education, { width: w });
  }

  if (data.certifications?.length) {
    sectionCompact('Certifications');
    doc.fontSize(8.5).font('Helvetica').fillColor('#222')
      .text(data.certifications.join('  |  '), { width: w });
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function generatePDF(resumeData, template = 'ats', outputPath) {
  return new Promise((resolve, reject) => {
    const marginMap = { ats: 50, modern: 50, compact: 40 };
    const margin = marginMap[template] || 50;

    const doc = new PDFDocument({ margin, size: 'A4' });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    try {
      if (template === 'modern') buildModern(doc, resumeData);
      else if (template === 'compact') buildCompact(doc, resumeData);
      else buildATS(doc, resumeData);
    } catch (err) {
      reject(err);
      return;
    }

    doc.end();
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}
