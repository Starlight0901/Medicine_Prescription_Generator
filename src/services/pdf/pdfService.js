import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { LOGO_PATH, RX_ICON_PATH, SEAL_PATH, SIGNATURE_PATH } from '../../data/branding';
import { formatDate, resolvePatientAge } from '../../utils/dateUtils';
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

function wrapTextPreservingBreaks(text, maxWidth, font, fontSize) {
  const rawLines = String(text ?? '').split('\n');
  const outputLines = [];

  rawLines.forEach((rawLine) => {
    if (rawLine.trim() === '') {
      outputLines.push('');
      return;
    }

    outputLines.push(...wrapText(rawLine, maxWidth, font, fontSize));
  });

  if (outputLines.length === 0) {
    outputLines.push('');
  }

  return outputLines;
}

function drawPreservedTextBlock(page, text, x, y, maxWidth, font, fontSize, lineHeight) {
  const lines = wrapTextPreservingBreaks(text, maxWidth, font, fontSize);
  return drawLines(page, lines, x, y, font, fontSize, COLORS.text, lineHeight);
}

function drawReferralPageBorder(page, layout) {
  drawGradientPrescriptionBorder(
    page,
    {
      x: layout.borderInset,
      y: layout.borderInset,
      width: layout.frameWidth,
      height: layout.frameHeight,
    },
    layout.borderThickness
  );
}

function getReferralContinuationMinY(layout) {
  return layout.borderInset + layout.contentPad;
}

function getReferralFooterMinY(layout) {
  return layout.borderInset + layout.contentPad + 120;
}

function getReferralContinuationStartY(layout) {
  return layout.frameTop - layout.contentPad;
}

const REFERRAL_LAYOUT = {
  CHARS_PER_LINE: 85,
  LINE_HEIGHT: 15,
  FONT_SIZE: 11,
};

function drawReferralContentWithPagination({
  pdfDoc,
  initialPage,
  initialY,
  page1StartY,
  continuationStartY,
  text,
  contentLeft,
  contentWidth,
  font,
  fontSize = REFERRAL_LAYOUT.FONT_SIZE,
  lineHeight = REFERRAL_LAYOUT.LINE_HEIGHT,
  layout,
}) {
  const lines = wrapTextPreservingBreaks(text, contentWidth, font, fontSize);
  let page = initialPage;
  let y = initialY;
  let pageIndex = 0;
  const continuationMinY = getReferralContinuationMinY(layout);
  const footerMinY = getReferralFooterMinY(layout);

  lines.forEach((line, index) => {
    const isLastLine = index === lines.length - 1;
    const minY = isLastLine ? footerMinY : continuationMinY;

    if (y - lineHeight < minY) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      drawReferralPageBorder(page, layout);
      pageIndex += 1;
      y = pageIndex === 0 ? page1StartY : continuationStartY;
    }

    if (line) {
      page.drawText(line, {
        x: contentLeft,
        y,
        size: fontSize,
        font,
        color: COLORS.text,
      });
    }

    y -= lineHeight;
  });

  return { page, y, pageIndex };
}

function drawPdfLetterHeader(page, fonts, images, layout, document) {
  const { regularFont } = fonts;
  const { logoImage } = images;
  const { contentLeft, contentRight, headerTop } = layout;

  const logoHeight = 96;
  const logoDims = logoImage.scale(logoHeight / logoImage.height);

  page.drawImage(logoImage, {
    x: contentLeft,
    y: headerTop - logoDims.height,
    width: logoDims.width,
    height: logoDims.height,
  });

  const dateText = `Date: ${formatDate(document.createdAt)}`;
  const dateWidth = regularFont.widthOfTextAtSize(dateText, 9);

  page.drawText(dateText, {
    x: contentRight - dateWidth,
    y: headerTop - 14,
    size: 9,
    font: regularFont,
    color: COLORS.muted,
  });

  return headerTop - logoDims.height - 22;
}

function drawPatientInformationSection(page, fonts, layout, prescription, patient) {
  const { regularFont, boldFont } = fonts;
  const { contentLeft, contentRight } = layout;
  let y = layout.y;

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

  const patientAge = resolvePatientAge(patient);
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

  return y;
}

function drawPdfFooter(page, fonts, images, layout, settings) {
  const { regularFont } = fonts;
  const { signatureImage, sealImage } = images;
  const { contentLeft, contentWidth, borderInset, contentPad } = layout;
  const contentRight = contentLeft + contentWidth;
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

  const signatureScale = 0.35;
  const sealScale = 0.2;
  const signatureDims = signatureImage.scale(signatureScale);
  const sealDims = sealImage.scale(sealScale);

  const stackWidth = Math.max(signatureDims.width, sealDims.width);
  const centerX = contentLeft + (contentWidth - stackWidth) / 2;

  const sealX = centerX + (stackWidth - sealDims.width) / 2;
  const sealY = borderInset + contentPad;

  const signatureX = centerX + (stackWidth - signatureDims.width) / 2;
  const signatureBaseY = sealY + sealDims.height + 12;

  page.drawImage(signatureImage, {
    x: signatureX,
    y: signatureBaseY,
    width: signatureDims.width,
    height: signatureDims.height,
  });

  page.drawImage(sealImage, {
    x: sealX,
    y: sealY,
    width: sealDims.width,
    height: sealDims.height,
  });

  const sealLabel = 'Seal';
  const sealLabelSize = 9;
  const sealLabelWidth = regularFont.widthOfTextAtSize(sealLabel, sealLabelSize);

  page.drawText(sealLabel, {
    x: sealX + (sealDims.width - sealLabelWidth) / 2,
    y: sealY - 8,
    size: sealLabelSize,
    font: regularFont,
    color: COLORS.muted,
  });
}

async function loadPdfBrandingImages(pdfDoc) {
  const [{ pngBytes: rxBytes }, logoBytes, signatureBytes, sealBytes] = await Promise.all([
    processRxIcon(RX_ICON_PATH),
    loadAssetBytes(LOGO_PATH),
    loadAssetBytes(SIGNATURE_PATH),
    loadAssetBytes(SEAL_PATH),
  ]);

  const [logoImage, rxImage, signatureImage, sealImage] = await Promise.all([
    pdfDoc.embedPng(logoBytes),
    pdfDoc.embedPng(rxBytes),
    pdfDoc.embedPng(signatureBytes),
    pdfDoc.embedPng(sealBytes),
  ]);

  return { logoImage, rxImage, signatureImage, sealImage };
}

function getPdfPageLayout() {
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

  return {
    borderInset,
    borderThickness,
    contentPad,
    frameWidth,
    frameHeight,
    contentLeft,
    contentRight,
    contentWidth,
    frameTop,
    headerTop,
  };
}

async function loadAssetBytes(url) {
  const response = await fetch(url);
  const contentType = response.headers.get('content-type');

  console.log('[loadAssetBytes]', {
    url,
    status: response.status,
    contentType,
  });

  if (!response.ok) {
    throw new Error(`Failed to load asset: ${url}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  console.log('[loadAssetBytes] byte length:', bytes.byteLength);

  if (bytes.byteLength < 1000) {
    throw new Error(
      `Asset too small (${bytes.byteLength} bytes), likely empty or corrupted: ${url}`
    );
  }

  return bytes;
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

function drawNumberedList(page, items, x, y, font, fontSize, maxWidth, lineHeight) {
  let currentY = y;

  items.forEach((item, index) => {
    const label = `${index + 1}. ${item}`;
    const lines = wrapText(label, maxWidth, font, fontSize);
    currentY = drawLines(page, lines, x, currentY, font, fontSize, COLORS.text, lineHeight);
    currentY -= 4;
  });

  return currentY;
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
    loadAssetBytes(SIGNATURE_PATH),
    loadAssetBytes(SEAL_PATH),
  ]);

  console.log('[generatePrescriptionPDF] before embed:', {
    signatureBytesLength: signatureBytes.byteLength,
    sealBytesLength: sealBytes.byteLength,
  });

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

  const patientAge = resolvePatientAge(patient);
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

  const signatureScale = 0.35;
  const sealScale = 0.2;
  const signatureDims = signatureImage.scale(signatureScale);
  const sealDims = sealImage.scale(sealScale);

  const stackWidth = Math.max(signatureDims.width, sealDims.width);
  const centerX = contentLeft + (contentWidth - stackWidth) / 2;

  const sealX = centerX + (stackWidth - sealDims.width) / 2;
  const sealY = borderInset + contentPad;

  const signatureX = centerX + (stackWidth - signatureDims.width) / 2;
  const signatureBaseY = sealY + sealDims.height + 12;

  page.drawImage(signatureImage, {
    x: signatureX,
    y: signatureBaseY,
    width: signatureDims.width,
    height: signatureDims.height,
  });

  page.drawImage(sealImage, {
    x: sealX,
    y: sealY,
    width: sealDims.width,
    height: sealDims.height,
  });

  const sealLabel = 'Seal';
  const sealLabelSize = 9;
  const sealLabelWidth = regularFont.widthOfTextAtSize(sealLabel, sealLabelSize);

  page.drawText(sealLabel, {
    x: sealX + (sealDims.width - sealLabelWidth) / 2,
    y: sealY - 8,
    size: sealLabelSize,
    font: regularFont,
    color: COLORS.muted,
  });

  return pdfDoc.save();
}

export async function generateReferralPDF({ prescription, settings, patient }) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const images = await loadPdfBrandingImages(pdfDoc);
  const layout = getPdfPageLayout();
  const {
    contentLeft,
    contentRight,
    contentWidth,
    headerTop,
  } = layout;

  drawReferralPageBorder(page, layout);

  let y = drawPdfLetterHeader(
    page,
    { regularFont, boldFont },
    { logoImage: images.logoImage },
    { contentLeft, contentRight, headerTop },
    prescription
  );

  y = drawPatientInformationSection(
    page,
    { regularFont, boldFont },
    { contentLeft, contentRight, y },
    prescription,
    patient
  );

  y -= 16;
  const page1StartY = y;
  const continuationStartY = getReferralContinuationStartY(layout);

  const { page: finalPage } = drawReferralContentWithPagination({
    pdfDoc,
    initialPage: page,
    initialY: y,
    page1StartY,
    continuationStartY,
    text: prescription.referralContent,
    contentLeft,
    contentWidth,
    font: regularFont,
    layout,
  });

  drawPdfFooter(
    finalPage,
    { regularFont },
    { signatureImage: images.signatureImage, sealImage: images.sealImage },
    {
      contentLeft,
      contentWidth,
      borderInset: layout.borderInset,
      contentPad: layout.contentPad,
    },
    settings
  );

  return pdfDoc.save();
}

export async function generateInvestigationPDF({ prescription, settings, patient }) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const images = await loadPdfBrandingImages(pdfDoc);
  const layout = getPdfPageLayout();
  const {
    borderInset,
    borderThickness,
    contentPad,
    frameWidth,
    frameHeight,
    contentLeft,
    contentRight,
    contentWidth,
    headerTop,
  } = layout;

  drawGradientPrescriptionBorder(
    page,
    { x: borderInset, y: borderInset, width: frameWidth, height: frameHeight },
    borderThickness
  );

  let y = drawPdfLetterHeader(
    page,
    { regularFont, boldFont },
    { logoImage: images.logoImage },
    { contentLeft, contentRight, headerTop },
    prescription
  );

  y = drawPatientInformationSection(
    page,
    { regularFont, boldFont },
    { contentLeft, contentRight, y },
    prescription,
    patient
  );

  y -= 8;

  if (isNonEmpty(prescription.investigationNotes)) {
    page.drawText('Clinical Notes', {
      x: contentLeft,
      y,
      size: 12,
      font: boldFont,
      color: COLORS.text,
    });
    y -= 18;
    y = drawPreservedTextBlock(
      page,
      prescription.investigationNotes,
      contentLeft,
      y,
      contentWidth,
      regularFont,
      11,
      15
    );
    y -= 12;
  }

  const investigations = (prescription.investigations ?? [])
    .map((item) => String(item ?? '').trim())
    .filter(Boolean);

  page.drawText('Investigations & Tests', {
    x: contentLeft,
    y,
    size: 12,
    font: boldFont,
    color: COLORS.text,
  });
  y -= 18;

  y = drawNumberedList(
    page,
    investigations,
    contentLeft,
    y,
    regularFont,
    11,
    contentWidth,
    16
  );

  const medicines = (prescription.medicines ?? []).filter((medicine) => isNonEmpty(medicine.name));

  if (medicines.length > 0) {
    y -= 8;
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

  drawPdfFooter(
    page,
    { regularFont },
    { signatureImage: images.signatureImage, sealImage: images.sealImage },
    {
      contentLeft,
      contentWidth,
      borderInset,
      contentPad,
    },
    settings
  );

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
  let pdfBytes;
  let prefix = 'prescription';

  if (prescription?.type === 'referral') {
    pdfBytes = await generateReferralPDF({ prescription, settings, patient });
    prefix = 'referral';
  } else if (prescription?.type === 'investigation') {
    pdfBytes = await generateInvestigationPDF({ prescription, settings, patient });
    prefix = 'investigation';
  } else {
    pdfBytes = await generatePrescriptionPDF({ prescription, settings, patient });
  }

  const safeName = prescription.patientName.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
  const datePart = new Date(prescription.createdAt).toISOString().slice(0, 10);
  downloadPdf(pdfBytes, `${prefix}_${safeName}_${datePart}.pdf`);
}
