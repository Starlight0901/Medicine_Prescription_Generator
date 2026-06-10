import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { calculateAge, formatDate } from '../../utils/dateUtils';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;

const COLORS = {
  primary: rgb(0.12, 0.23, 0.37),
  text: rgb(0.15, 0.15, 0.15),
  muted: rgb(0.4, 0.4, 0.4),
  border: rgb(0.75, 0.75, 0.75),
  tableHeader: rgb(0.93, 0.95, 0.98),
};

function loadImageElement(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    image.src = url;
  });
}

async function imageElementToPngBytes(image) {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;

  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0);

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((result) => {
      if (!result) {
        reject(new Error('Unable to convert image to PNG.'));
        return;
      }
      resolve(result);
    }, 'image/png');
  });

  return new Uint8Array(await blob.arrayBuffer());
}

async function createPlaceholderImageBytes(label) {
  const canvas = document.createElement('canvas');
  canvas.width = 220;
  canvas.height = 90;

  const context = canvas.getContext('2d');
  context.fillStyle = '#f4f6f8';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#c5ccd3';
  context.lineWidth = 2;
  context.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
  context.fillStyle = '#5f6b7a';
  context.font = '16px Arial';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, canvas.width / 2, canvas.height / 2);

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/png');
  });

  return new Uint8Array(await blob.arrayBuffer());
}

async function resolveImageBytes(url, placeholderLabel) {
  if (url) {
    try {
      const image = await loadImageElement(url);
      return imageElementToPngBytes(image);
    } catch {
      // Fall back to placeholder when URL fails or CORS blocks the image.
    }
  }

  return createPlaceholderImageBytes(placeholderLabel);
}

function wrapText(text, maxWidth, font, fontSize) {
  const words = String(text ?? '').split(/\s+/).filter(Boolean);
  const lines = [];
  let currentLine = '';

  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);

    if (width <= maxWidth) {
      currentLine = testLine;
      return;
    }

    if (currentLine) lines.push(currentLine);
    currentLine = word;
  });

  if (currentLine) lines.push(currentLine);
  if (lines.length === 0) lines.push('');

  return lines;
}

function drawLines(page, lines, x, y, font, fontSize, color, lineHeight) {
  lines.forEach((line, index) => {
    page.drawText(line, {
      x,
      y: y - index * lineHeight,
      size: fontSize,
      font,
      color,
    });
  });

  return y - lines.length * lineHeight;
}

function drawDivider(page, y, color = COLORS.border) {
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 1,
    color,
  });
}

function isNonEmpty(value) {
  return String(value ?? '').trim().length > 0;
}

function formatDoctorHeaderName(doctorName) {
  const name = String(doctorName ?? '').trim() || 'Doctor';

  if (/^dr\.?\s/i.test(name)) {
    return name;
  }

  return `Dr. ${name}`;
}

function renderIfNotEmpty(doc, label, value, x, y) {
  if (!isNonEmpty(value)) {
    return y;
  }

  const {
    page,
    boldFont,
    regularFont,
    maxWidth = PAGE_WIDTH - MARGIN * 2,
    labelSize = 12,
    contentSize = 11,
    labelGap = 18,
    contentLineHeight = 15,
  } = doc;

  const trimmedValue = String(value).trim();

  page.drawText(label, {
    x,
    y,
    size: labelSize,
    font: boldFont,
    color: COLORS.text,
  });

  let nextY = y - labelGap;

  if (maxWidth) {
    nextY = drawLines(
      page,
      wrapText(trimmedValue, maxWidth, regularFont, contentSize),
      x,
      nextY,
      regularFont,
      contentSize,
      COLORS.text,
      contentLineHeight
    );
  } else {
    page.drawText(trimmedValue, {
      x,
      y: nextY,
      size: contentSize,
      font: regularFont,
      color: COLORS.text,
    });
    nextY -= contentLineHeight;
  }

  return nextY;
}

function drawTable(page, startY, medicines, regularFont, boldFont) {
  const tableX = MARGIN;
  const tableWidth = PAGE_WIDTH - MARGIN * 2;
  const columns = [
    { key: 'index', label: '#', width: 28 },
    { key: 'name', label: 'Medicine', width: 150 },
    { key: 'dosage', label: 'Dosage', width: 90 },
    { key: 'frequency', label: 'Frequency', width: 120 },
    { key: 'duration', label: 'Duration', width: 90 },
  ];

  const rowHeight = 24;
  let y = startY;

  page.drawRectangle({
    x: tableX,
    y: y - rowHeight,
    width: tableWidth,
    height: rowHeight,
    color: COLORS.tableHeader,
    borderColor: COLORS.border,
    borderWidth: 1,
  });

  let columnX = tableX;
  columns.forEach((column) => {
    page.drawText(column.label, {
      x: columnX + 6,
      y: y - 16,
      size: 10,
      font: boldFont,
      color: COLORS.primary,
    });
    columnX += column.width;
  });

  y -= rowHeight;

  medicines.forEach((medicine, index) => {
    page.drawRectangle({
      x: tableX,
      y: y - rowHeight,
      width: tableWidth,
      height: rowHeight,
      borderColor: COLORS.border,
      borderWidth: 1,
    });

    const values = [
      String(index + 1),
      medicine.name ?? '',
      medicine.dosage ?? '',
      medicine.frequency ?? '',
      medicine.duration ?? '',
    ];

    columnX = tableX;
    values.forEach((value, valueIndex) => {
      page.drawText(value, {
        x: columnX + 6,
        y: y - 16,
        size: 10,
        font: regularFont,
        color: COLORS.text,
      });
      columnX += columns[valueIndex].width;
    });

    y -= rowHeight;
  });

  return y - 12;
}

export async function generatePrescriptionPDF({ prescription, settings, patient }) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const [signatureBytes, sealBytes] = await Promise.all([
    resolveImageBytes(settings.signatureImageUrl, 'Signature'),
    resolveImageBytes(settings.sealImageUrl, 'Seal'),
  ]);

  const signatureImage = await pdfDoc.embedPng(signatureBytes);
  const sealImage = await pdfDoc.embedPng(sealBytes);

  let y = PAGE_HEIGHT - MARGIN;

  page.drawText(formatDoctorHeaderName(settings.doctorName), {
    x: MARGIN,
    y,
    size: 20,
    font: boldFont,
    color: COLORS.primary,
  });

  page.drawText(`Date: ${formatDate(prescription.createdAt)}`, {
    x: PAGE_WIDTH - MARGIN - 150,
    y,
    size: 11,
    font: regularFont,
    color: COLORS.muted,
  });

  y -= 16;
  drawDivider(page, y);
  y -= 28;

  page.drawText('PRESCRIPTION', {
    x: MARGIN,
    y,
    size: 16,
    font: boldFont,
    color: COLORS.primary,
  });
  y -= 28;

  page.drawText('Patient Information', {
    x: MARGIN,
    y,
    size: 12,
    font: boldFont,
    color: COLORS.text,
  });
  y -= 20;

  const patientAge = calculateAge(patient?.dateOfBirth);
  const patientLines = [
    `Name: ${prescription.patientName}`,
    patientAge != null ? `Age: ${patientAge}` : null,
    patient?.gender ? `Gender: ${patient.gender}` : null,
  ].filter(Boolean);

  patientLines.forEach((line) => {
    page.drawText(line, {
      x: MARGIN,
      y,
      size: 11,
      font: regularFont,
      color: COLORS.text,
    });
    y -= 16;
  });

  const sectionDoc = {
    page,
    boldFont,
    regularFont,
    maxWidth: PAGE_WIDTH - MARGIN * 2,
  };

  y -= 8;
  y = renderIfNotEmpty(sectionDoc, 'Diagnosis', prescription.diagnosis, MARGIN, y);
  y -= 10;

  const medicines = (prescription.medicines ?? []).filter((medicine) => isNonEmpty(medicine.name));

  if (medicines.length > 0) {
    page.drawText('Medicines', {
      x: MARGIN,
      y,
      size: 12,
      font: boldFont,
      color: COLORS.text,
    });
    y -= 16;
    y = drawTable(page, y, medicines, regularFont, boldFont);
  }

  y = renderIfNotEmpty(sectionDoc, 'Prescription Notes', prescription.notes, MARGIN, y);

  const footerY = 120;
  drawDivider(page, footerY + 36);

  page.drawText(settings.doctorName || 'Doctor', {
    x: MARGIN,
    y: footerY + 18,
    size: 11,
    font: boldFont,
    color: COLORS.text,
  });

  page.drawText('Authorized Signature', {
    x: MARGIN,
    y: footerY + 2,
    size: 9,
    font: regularFont,
    color: COLORS.muted,
  });

  const signatureDims = signatureImage.scale(0.35);
  page.drawImage(signatureImage, {
    x: MARGIN,
    y: 36,
    width: signatureDims.width,
    height: signatureDims.height,
  });

  const sealDims = sealImage.scale(0.3);
  page.drawImage(sealImage, {
    x: PAGE_WIDTH - MARGIN - sealDims.width,
    y: 36,
    width: sealDims.width,
    height: sealDims.height,
  });

  page.drawText('Seal', {
    x: PAGE_WIDTH - MARGIN - sealDims.width,
    y: 28,
    size: 9,
    font: regularFont,
    color: COLORS.muted,
  });

  return pdfDoc.save();
}

export function downloadPdf(pdfBytes, filename) {
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function downloadPrescriptionPDF({ prescription, settings, patient }) {
  const pdfBytes = await generatePrescriptionPDF({ prescription, settings, patient });
  const safeName = prescription.patientName.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
  const datePart = new Date(prescription.createdAt).toISOString().slice(0, 10);
  downloadPdf(pdfBytes, `prescription_${safeName}_${datePart}.pdf`);
}
