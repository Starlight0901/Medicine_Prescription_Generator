import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { LOGO_PATH, RX_ICON_PATH } from '../../data/branding';
import { calculateAge, formatDate } from '../../utils/dateUtils';
import { processRxIcon } from '../../utils/rxIconProcessor';

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
    const isExternal =
      url.startsWith('http') &&
      typeof window !== 'undefined' &&
      !url.startsWith(window.location.origin);

    if (isExternal) {
      image.crossOrigin = 'anonymous';
    }

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

function drawDivider(page, y, left, right, color = COLORS.border) {
  page.drawLine({
    start: { x: left, y },
    end: { x: right, y },
    thickness: 1,
    color,
  });
}

function isNonEmpty(value) {
  return String(value ?? '').trim().length > 0;
}

const GRADIENT_BORDER = {
  olive: rgb(0.45, 0.5, 0.28),
  lightBlue: rgb(0.62, 0.76, 0.84),
  darkBlue: rgb(0.11, 0.22, 0.38),
};

function mixColor(colorA, colorB, amount) {
  return rgb(
    colorA.red + (colorB.red - colorA.red) * amount,
    colorA.green + (colorB.green - colorA.green) * amount,
    colorA.blue + (colorB.blue - colorA.blue) * amount
  );
}

function drawGradientEdge(page, start, end, startColor, endColor, thickness, segments = 24) {
  for (let index = 0; index < segments; index += 1) {
    const t0 = index / segments;
    const t1 = (index + 1) / segments;
    const color = mixColor(startColor, endColor, (t0 + t1) / 2);

    page.drawLine({
      start: {
        x: start.x + (end.x - start.x) * t0,
        y: start.y + (end.y - start.y) * t0,
      },
      end: {
        x: start.x + (end.x - start.x) * t1,
        y: start.y + (end.y - start.y) * t1,
      },
      thickness,
      color,
    });
  }
}

function drawGradientPrescriptionBorder(page, rect, thickness = 2) {
  const { x, y, width, height } = rect;
  const topLeft = { x, y: y + height };
  const topRight = { x: x + width, y: y + height };
  const bottomRight = { x: x + width, y };
  const bottomLeft = { x, y };

  drawGradientEdge(page, topLeft, topRight, GRADIENT_BORDER.olive, GRADIENT_BORDER.lightBlue, thickness);
  drawGradientEdge(page, topRight, bottomRight, GRADIENT_BORDER.lightBlue, GRADIENT_BORDER.darkBlue, thickness);
  drawGradientEdge(page, bottomRight, bottomLeft, GRADIENT_BORDER.darkBlue, GRADIENT_BORDER.olive, thickness);
  drawGradientEdge(page, bottomLeft, topLeft, GRADIENT_BORDER.olive, GRADIENT_BORDER.darkBlue, thickness);
}

async function loadAssetBytes(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load asset: ${url}`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

function drawPdfBrandingHeader(page, fonts, images, layout, prescription) {
  const { regularFont } = fonts;
  const { logoImage, rxImage } = images;
  const { contentLeft, contentRight, headerTop } = layout;

  const logoHeight = 96;
  const rxHeight = 32;
  const logoDims = logoImage.scale(logoHeight / logoImage.height);
  const rxDims = rxImage.scale(rxHeight / rxImage.height);

  page.drawImage(logoImage, {
    x: contentLeft,
    y: headerTop - logoDims.height,
    width: logoDims.width,
    height: logoDims.height,
  });

  page.drawImage(rxImage, {
    x: contentRight - rxDims.width,
    y: headerTop - rxDims.height,
    width: rxDims.width,
    height: rxDims.height,
  });

  const dateText = `Date: ${formatDate(prescription.createdAt)}`;
  const dateWidth = regularFont.widthOfTextAtSize(dateText, 9);

  page.drawText(dateText, {
    x: contentRight - dateWidth,
    y: headerTop - rxDims.height - 14,
    size: 9,
    font: regularFont,
    color: COLORS.muted,
  });

  const contentStartY = headerTop - Math.max(logoDims.height, rxDims.height) - 22;
  return contentStartY;
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

function drawTable(page, startY, medicines, regularFont, boldFont, contentLeft, contentWidth) {
  const tableX = contentLeft;
  const tableWidth = contentWidth;
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

  const [{ pngBytes: rxBytes }, logoBytes, signatureBytes, sealBytes] = await Promise.all([
    processRxIcon(RX_ICON_PATH),
    loadAssetBytes(LOGO_PATH),
    resolveImageBytes(settings.signatureImageUrl, 'Signature'),
    resolveImageBytes(settings.sealImageUrl, 'Seal'),
  ]);

  const [logoImage, rxImage, signatureImage, sealImage] = await Promise.all([
    pdfDoc.embedPng(logoBytes),
    pdfDoc.embedPng(rxBytes),
    pdfDoc.embedPng(signatureBytes),
    pdfDoc.embedPng(sealBytes),
  ]);

  const borderInset = 28;
  const borderThickness = 2;
  const contentPad = 28;
  const frameWidth = PAGE_WIDTH - borderInset * 2;
  const frameHeight = PAGE_HEIGHT - borderInset * 2;
  const contentLeft = borderInset + borderThickness + contentPad;
  const contentRight = PAGE_WIDTH - contentLeft;
  const contentWidth = contentRight - contentLeft;
  const frameTop = PAGE_HEIGHT - borderInset;
  const headerTop = frameTop - contentPad;

  drawGradientPrescriptionBorder(
    page,
    { x: borderInset, y: borderInset, width: frameWidth, height: frameHeight },
    borderThickness
  );

  let y = drawPdfBrandingHeader(
    page,
    { regularFont, boldFont },
    { logoImage, rxImage },
    { contentLeft, contentRight, headerTop },
    prescription
  );

  drawDivider(page, y, contentLeft, contentRight);
  y -= 20;

  page.drawText('Patient Information', {
    x: contentLeft,
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
      x: contentLeft,
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
    maxWidth: contentWidth,
  };

  y -= 8;
  y = renderIfNotEmpty(sectionDoc, 'Diagnosis', prescription.diagnosis, contentLeft, y);
  y -= 10;

  const medicines = (prescription.medicines ?? []).filter((medicine) => isNonEmpty(medicine.name));

  if (medicines.length > 0) {
    page.drawText('Medicines', {
      x: contentLeft,
      y,
      size: 12,
      font: boldFont,
      color: COLORS.text,
    });
    y -= 16;
    y = drawTable(page, y, medicines, regularFont, boldFont, contentLeft, contentWidth);
  }

  y = renderIfNotEmpty(sectionDoc, 'Prescription Notes', prescription.notes, contentLeft, y);

  const footerY = borderInset + contentPad + 72;
  drawDivider(page, footerY + 36, contentLeft, contentRight);

  if (isNonEmpty(settings.doctorName)) {
    page.drawText(settings.doctorName, {
      x: contentLeft,
      y: footerY + 18,
      size: 9,
      font: regularFont,
      color: COLORS.muted,
    });
  }

  page.drawText('Authorized Signature', {
    x: contentLeft,
    y: footerY + 2,
    size: 9,
    font: regularFont,
    color: COLORS.muted,
  });

  const signatureDims = signatureImage.scale(0.35);
  page.drawImage(signatureImage, {
    x: contentLeft,
    y: borderInset + contentPad,
    width: signatureDims.width,
    height: signatureDims.height,
  });

  const sealDims = sealImage.scale(0.3);
  page.drawImage(sealImage, {
    x: contentRight - sealDims.width,
    y: borderInset + contentPad,
    width: sealDims.width,
    height: sealDims.height,
  });

  page.drawText('Seal', {
    x: contentRight - sealDims.width,
    y: borderInset + contentPad - 8,
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
