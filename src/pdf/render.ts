import { downloadTextFile } from '../bridge/io';

export interface Pz1PdfSummary {
  team: string;
  lineTitle: string;
  variantTitle: string;
  stationCount: number;
  filledConsumerCells: number;
  filledIndicatorCount: number;
  createdAt: string;
}

export function downloadPz1Pdf(summary: Pz1PdfSummary, fileName: string): void {
  downloadTextFile(fileName, 'application/pdf', createPdfBytes(createPz1PdfLines(summary)));
}

export function createPdfBytes(lines: string[]) {
  const content = lines
    .map((line, index) => `BT /F1 12 Tf 72 ${760 - index * 22} Td (${escapePdfText(normalizePdfText(line))}) Tj ET`)
    .join('\n');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += object;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const bytes = new TextEncoder().encode(pdf);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function createPz1PdfLines(summary: Pz1PdfSummary) {
  return [
    'PZ1 MVP report',
    `Team: ${summary.team || 'not filled'}`,
    `Line: ${summary.lineTitle || 'not filled'}`,
    `Variant: ${summary.variantTitle}`,
    `Date: ${new Date(summary.createdAt).toLocaleDateString('ru-RU')}`,
    `Stations filled: ${summary.stationCount}`,
    `Consumer property cells filled: ${summary.filledConsumerCells}`,
    `Final indicators filled: ${summary.filledIndicatorCount}`,
    'TODO: full report template, formula images and map preview are deferred.',
  ];
}

function normalizePdfText(value: string) {
  return value.replace(/[^\x20-\x7E]/g, '?');
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}
