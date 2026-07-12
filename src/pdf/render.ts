import { downloadTextFile } from '../bridge/io';

const PDF_WIDTH = 595;
const PDF_HEIGHT = 842;
const CANVAS_SCALE = 2;
const PAGE_MARGIN = 64;
const TEXT_WIDTH = PDF_WIDTH - PAGE_MARGIN * 2;
const JPEG_QUALITY = 0.94;

type PdfLineKind = 'title' | 'subtitle' | 'section' | 'item' | 'note';

interface PdfLine {
  kind: PdfLineKind;
  text: string;
}

interface PdfPageImage {
  data: Uint8Array;
  width: number;
  height: number;
}

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
  const pageImage = createReportPageImage(createPz1PdfLines(summary));
  downloadTextFile(fileName, 'application/pdf', createPdfBytes(pageImage));
}

export function createPz1PdfLines(summary: Pz1PdfSummary): PdfLine[] {
  return [
    { kind: 'title', text: 'ПЗ1. Технико-экономическое обоснование' },
    { kind: 'subtitle', text: 'Отчет по практическому заданию' },
    { kind: 'section', text: 'Паспорт работы' },
    { kind: 'item', text: `Команда: ${formatRequiredValue(summary.team)}` },
    { kind: 'item', text: `Линия: ${formatRequiredValue(summary.lineTitle)}` },
    { kind: 'item', text: `Вариант: ${formatRequiredValue(summary.variantTitle)}` },
    { kind: 'item', text: `Дата формирования: ${formatDate(summary.createdAt)}` },
    { kind: 'section', text: 'Сводка заполнения' },
    { kind: 'item', text: `Станции с координатами: ${summary.stationCount}` },
    { kind: 'item', text: `Ячейки потребительских свойств: ${summary.filledConsumerCells}` },
    { kind: 'item', text: `Итоговые показатели: ${summary.filledIndicatorCount}` },
    {
      kind: 'note',
      text: 'Файл сформирован в статическом симуляторе ВСМ. JSON-мост сохраняется отдельно для повторной загрузки результата.',
    },
  ];
}

export function createPdfBytes(pageImage: PdfPageImage) {
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let byteLength = 0;

  function push(part: string | Uint8Array) {
    const bytes = typeof part === 'string' ? new TextEncoder().encode(part) : part;
    chunks.push(bytes);
    byteLength += bytes.byteLength;
  }

  function addObject(index: number, parts: Array<string | Uint8Array>) {
    offsets[index] = byteLength;
    push(`${index} 0 obj\n`);
    for (const part of parts) {
      push(part);
    }
    push('\nendobj\n');
  }

  const content = new TextEncoder().encode(`q\n${PDF_WIDTH} 0 0 ${PDF_HEIGHT} 0 0 cm\n/Im1 Do\nQ\n`);

  push('%PDF-1.4\n');
  addObject(1, ['<< /Type /Catalog /Pages 2 0 R >>']);
  addObject(2, ['<< /Type /Pages /Kids [3 0 R] /Count 1 >>']);
  addObject(3, [
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_WIDTH} ${PDF_HEIGHT}] `,
    '/Resources << /XObject << /Im1 5 0 R >> >> /Contents 4 0 R >>',
  ]);
  addObject(4, [`<< /Length ${content.byteLength} >>\nstream\n`, content, 'endstream']);
  addObject(5, [
    `<< /Type /XObject /Subtype /Image /Width ${pageImage.width} /Height ${pageImage.height} `,
    `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${pageImage.data.byteLength} >>\nstream\n`,
    pageImage.data,
    '\nendstream',
  ]);

  const xrefOffset = byteLength;
  push(`xref\n0 ${offsets.length}\n`);
  push('0000000000 65535 f \n');
  for (const offset of offsets.slice(1)) {
    push(`${String(offset).padStart(10, '0')} 00000 n \n`);
  }
  push(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  return concatBytes(chunks);
}

function createReportPageImage(lines: PdfLine[]): PdfPageImage {
  const canvas = document.createElement('canvas');
  canvas.width = PDF_WIDTH * CANVAS_SCALE;
  canvas.height = PDF_HEIGHT * CANVAS_SCALE;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Не удалось подготовить PDF: браузер не поддерживает canvas.');
  }

  context.scale(CANVAS_SCALE, CANVAS_SCALE);
  drawReportPage(context, lines);

  return {
    data: dataUrlToBytes(canvas.toDataURL('image/jpeg', JPEG_QUALITY)),
    width: canvas.width,
    height: canvas.height,
  };
}

function drawReportPage(context: CanvasRenderingContext2D, lines: PdfLine[]) {
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, PDF_WIDTH, PDF_HEIGHT);

  context.fillStyle = '#f4f6fb';
  context.fillRect(0, 0, PDF_WIDTH, 150);
  context.fillStyle = '#3a288b';
  context.fillRect(0, 0, 14, PDF_HEIGHT);

  let y = 74;
  for (const line of lines) {
    const style = getLineStyle(line.kind);
    context.font = style.font;
    context.fillStyle = style.color;
    context.textBaseline = 'top';

    const wrappedLines = wrapText(context, line.text, TEXT_WIDTH);
    for (const wrappedLine of wrappedLines) {
      context.fillText(wrappedLine, PAGE_MARGIN, y);
      y += style.lineHeight;
    }
    y += style.marginAfter;
  }

  context.fillStyle = '#8a91a3';
  context.font = '600 10px Arial, sans-serif';
  context.fillText('vsm-simulator.ru', PAGE_MARGIN, PDF_HEIGHT - 54);
}

function getLineStyle(kind: PdfLineKind) {
  switch (kind) {
    case 'title':
      return { color: '#1f2452', font: '700 24px Arial, sans-serif', lineHeight: 32, marginAfter: 4 };
    case 'subtitle':
      return { color: '#596074', font: '600 14px Arial, sans-serif', lineHeight: 20, marginAfter: 34 };
    case 'section':
      return { color: '#3a288b', font: '700 16px Arial, sans-serif', lineHeight: 22, marginAfter: 10 };
    case 'note':
      return { color: '#596074', font: '400 12px Arial, sans-serif', lineHeight: 18, marginAfter: 0 };
    case 'item':
    default:
      return { color: '#111827', font: '400 13px Arial, sans-serif', lineHeight: 20, marginAfter: 5 };
  }
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (currentLine && context.measureText(nextLine).width > maxWidth) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = nextLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function formatRequiredValue(value: string) {
  const trimmed = value.trim();
  return trimmed || 'не заполнено';
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'не указана' : date.toLocaleDateString('ru-RU');
}

function dataUrlToBytes(dataUrl: string) {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function concatBytes(chunks: Uint8Array[]) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const buffer = new ArrayBuffer(totalLength);
  const result = new Uint8Array(buffer);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return buffer;
}
