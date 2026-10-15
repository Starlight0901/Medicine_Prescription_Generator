import { LineCapStyle, PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { LOGO_PATH, RX_ICON_PATH, SEAL_PATH, SIGNATURE_PATH } from '../../data/branding';
import { buildCertificatePdfRequest, formatCertificateDate, formatCertificateFieldValue, SALUTATIONS } from '../../utils/certificateFormUtils';
import { resolveFieldDataType } from '../../utils/certificateTemplateUtils';
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

const CERTIFICATE_BODY_SIZE = 12;
const CERTIFICATE_LEADING = 18;
const PERIOD_FIELD_KEYS = new Set(['startDate', 'endDate', 'duration']);
const SPACE_HEIGHTS = { small: 14, medium: 28, large: 42 };
const LETTERHEAD_FIELD_KEYS = new Set([
  'doctorName',
  'clinicAddress',
  'clinicEmail',
  'certificateDate',
]);

function certificateTitle(template) {
  if (template?.category === 'medical-fitness') return 'MEDICAL FITNESS CERTIFICATE';
  if (template?.category === 'other') {
    const heading = template.blocks?.find((block) => block.type === 'heading')?.text;
    return String(heading || 'MEDICAL CERTIFICATE').toUpperCase();
  }

  return 'MEDICAL CERTIFICATE';
}

function certificateLines(text, maxWidth, font, fontSize) {
  return wrapTextPreservingBreaks(text, maxWidth, font, fontSize).flatMap((line) => {
    if (!line || font.widthOfTextAtSize(line, fontSize) <= maxWidth) return [line];

    const chunks = [];
    let current = '';

    Array.from(line).forEach((character) => {
      const next = current + character;
      if (font.widthOfTextAtSize(next, fontSize) <= maxWidth) {
        current = next;
        return;
      }

      if (current) chunks.push(current);
      current = character;
    });

    if (current) chunks.push(current);
    return chunks;
  });
}

function drawDottedRule(page, x, y, width) {
  page.drawLine({
    start: { x, y },
    end: { x: x + width, y },
    thickness: 0.8,
    color: COLORS.text,
    dashArray: [0.4, 2.4],
    lineCap: LineCapStyle.Round,
  });
}

function drawRightAlignedLines(page, lines, right, y, font, fontSize, lineHeight) {
  lines.forEach((line) => {
    const width = font.widthOfTextAtSize(line, fontSize);
    page.drawText(line, {
      x: right - width,
      y,
      size: fontSize,
      font,
      color: COLORS.muted,
    });
    y -= lineHeight;
  });

  return y;
}

function drawCertificateContact(page, font, layout, settings, startY) {
  const address = String(settings?.clinicAddress ?? '').trim();
  const email = String(settings?.clinicEmail ?? '').trim();
  const logoRight = layout.contentLeft + 158;
  const columnWidth = Math.max(120, layout.contentRight - logoRight - 8);
  const lines = [
    ...(address ? certificateLines(address, columnWidth, font, 9) : []),
    ...(email ? certificateLines(email, columnWidth, font, 9) : []),
  ];

  if (lines.length === 0) return startY;

  return drawRightAlignedLines(page, lines.slice(0, 6), layout.contentRight, startY, font, 9, 12);
}

function buildCertificateSections(template, values) {
  const blocks = Array.isArray(template?.blocks) ? template.blocks : [];
  const sections = [];
  let skippedTitle = false;
  let periodPlaced = false;

  blocks.forEach((block) => {
    if (block.type === 'heading') {
      if (!skippedTitle) {
        skippedTitle = true;
        return;
      }

      sections.push({ type: 'heading', text: block.text });
      return;
    }

    if (block.type === 'text') {
      sections.push({ type: 'text', text: block.text });
      return;
    }

    if (block.type === 'space') {
      sections.push({
        type: 'space',
        height: SPACE_HEIGHTS[block.size] || SPACE_HEIGHTS.small,
      });
      return;
    }

    if (LETTERHEAD_FIELD_KEYS.has(block.fieldKey)) return;

    if (PERIOD_FIELD_KEYS.has(block.fieldKey)) {
      if (!periodPlaced) {
        periodPlaced = true;
        sections.push({ type: 'period' });
      }
      return;
    }

    if (block.fieldKey === 'salutation') {
      sections.push({ type: 'salutation' });
      return;
    }

    if (block.fieldKey === 'patientName') {
      sections.push({ type: 'name', text: values?.patientName ?? '' });
      return;
    }

    if (block.fieldKey === 'medicalStatement') {
      sections.push({
        type: 'statement',
        label: block.label,
        text: values?.medicalStatement ?? '',
      });
      return;
    }

    const dataType = resolveFieldDataType(block);
    const rawValue = values?.fieldValues?.[block.fieldKey] ?? values?.[block.fieldKey] ?? '';
    const text = block.custom ? formatCertificateFieldValue(dataType, rawValue) : String(rawValue);
    if (block.custom && !text) return;

    if (block.custom && dataType === 'longText') {
      sections.push({ type: 'statement', label: block.label, text });
      return;
    }

    if (block.custom && dataType === 'date') {
      sections.push({ type: 'labeled', label: block.label, text });
      return;
    }

    sections.push({
      type: 'labeled',
      label: block.label,
      text,
    });
  });

  return sections;
}

function periodLine(template, values) {
  const blocks = Array.isArray(template?.blocks) ? template.blocks : [];
  const start = blocks.find((block) => block.fieldKey === 'startDate');
  const end = blocks.find((block) => block.fieldKey === 'endDate');
  const parts = [];

  if (start) parts.push(`${start.label} ${formatCertificateDate(values?.startDate)}`);
  if (end) parts.push(`${end.label} ${formatCertificateDate(values?.endDate)}`);

  let line = parts.join('    ');
  if (values?.duration != null && blocks.some((block) => block.fieldKey === 'duration')) {
    line = `${line}    (${values.duration} days)`.trim();
  }

  return line;
}

function createCertificateState(pdfDoc, layout, fonts) {
  const issueDateY = layout.borderInset + layout.contentPad + 72 + 36 + 18;

  return {
    pdfDoc,
    layout,
    fonts,
    page: null,
    y: 0,
    bodyMinY: issueDateY + 24,
    issueDateY,
  };
}

function addCertificatePage(state, { withLetterhead = false, images, settings, createdAt } = {}) {
  state.page = state.pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawReferralPageBorder(state.page, state.layout);

  if (!withLetterhead) {
    state.y = getReferralContinuationStartY(state.layout);
    return;
  }

  const headerBottom = drawPdfBrandingHeader(
    state.page,
    state.fonts,
    { logoImage: images.logoImage, rxImage: images.rxImage },
    {
      contentLeft: state.layout.contentLeft,
      contentRight: state.layout.contentRight,
      headerTop: state.layout.headerTop,
    },
    { createdAt }
  );
  const contactBottom = drawCertificateContact(
    state.page,
    state.fonts.regularFont,
    state.layout,
    settings,
    state.layout.headerTop - 32 - 28
  );

  state.y = Math.min(headerBottom, contactBottom) - 16;
}

function ensureCertificateRoom(state, height) {
  if (state.y - height >= state.bodyMinY) return;
  addCertificatePage(state);
}

function drawCertificateTitle(state, template) {
  const title = certificateTitle(template);
  const { boldFont } = state.fonts;
  const { contentLeft, contentWidth } = state.layout;
  let titleSize = 13;

  while (titleSize > 9 && boldFont.widthOfTextAtSize(title, titleSize) > contentWidth - 24) {
    titleSize -= 0.5;
  }

  const titleWidth = boldFont.widthOfTextAtSize(title, titleSize);
  const titleX = contentLeft + (contentWidth - titleWidth) / 2;

  ensureCertificateRoom(state, 28);
  state.page.drawText(title, {
    x: titleX,
    y: state.y,
    size: titleSize,
    font: boldFont,
    color: COLORS.text,
  });
  state.page.drawLine({
    start: { x: titleX, y: state.y - 3 },
    end: { x: titleX + titleWidth, y: state.y - 3 },
    thickness: 0.8,
    color: COLORS.text,
  });
  state.y -= 28;
}

function drawFlowingLines(state, lines, { font, size, dotted = false, minLines = 0 }) {
  const padded = [...lines];
  while (padded.length < minLines) padded.push('');

  padded.forEach((line) => {
    ensureCertificateRoom(state, CERTIFICATE_LEADING);
    if (line) {
      state.page.drawText(line, {
        x: state.layout.contentLeft,
        y: state.y,
        size,
        font,
        color: COLORS.text,
      });
    }
    if (dotted) {
      drawDottedRule(state.page, state.layout.contentLeft, state.y - 3, state.layout.contentWidth);
    }
    state.y -= CERTIFICATE_LEADING;
  });
}

function drawSalutationRow(state, selected) {
  const size = 12;
  ensureCertificateRoom(state, 28);
  let x = state.layout.contentLeft;

  SALUTATIONS.forEach((option) => {
    const width = state.fonts.regularFont.widthOfTextAtSize(option, size);
    if (option === selected) {
      state.page.drawEllipse({
        x: x + width / 2,
        y: state.y + 4,
        xScale: width / 2 + 6,
        yScale: 9,
        borderColor: COLORS.text,
        borderWidth: 1.1,
      });
    }

    state.page.drawText(option, {
      x,
      y: state.y,
      size,
      font: state.fonts.regularFont,
      color: COLORS.text,
    });
    x += width + 18;
  });

  state.y -= 26;
}

function drawCertificateSections(state, template, values) {
  const width = state.layout.contentWidth;
  const { regularFont, boldFont } = state.fonts;

  buildCertificateSections(template, values).forEach((section) => {
    if (section.type === 'space') {
      ensureCertificateRoom(state, section.height);
      state.y -= section.height;
      return;
    }

    if (section.type === 'heading') {
      const lines = certificateLines(section.text, width, boldFont, 12);
      drawFlowingLines(state, lines, { font: boldFont, size: 12 });
      state.y -= 4;
      return;
    }

    if (section.type === 'text') {
      const lines = certificateLines(section.text, width, regularFont, CERTIFICATE_BODY_SIZE);
      drawFlowingLines(state, lines, { font: regularFont, size: CERTIFICATE_BODY_SIZE });
      state.y -= 6;
      return;
    }

    if (section.type === 'salutation') {
      drawSalutationRow(state, values?.salutation);
      return;
    }

    if (section.type === 'name') {
      const lines = certificateLines(section.text, width, regularFont, CERTIFICATE_BODY_SIZE);
      drawFlowingLines(state, lines.length ? lines : [''], {
        font: regularFont,
        size: CERTIFICATE_BODY_SIZE,
        dotted: true,
        minLines: 1,
      });
      state.y -= 6;
      return;
    }

    if (section.type === 'period') {
      const lines = certificateLines(periodLine(template, values), width, regularFont, CERTIFICATE_BODY_SIZE);
      drawFlowingLines(state, lines, { font: regularFont, size: CERTIFICATE_BODY_SIZE });
      state.y -= 8;
      return;
    }

    if (section.type === 'statement') {
      const labelLines = certificateLines(section.label, width, boldFont, 11);
      drawFlowingLines(state, labelLines, { font: boldFont, size: 11 });
      const textLines = certificateLines(section.text, width, regularFont, CERTIFICATE_BODY_SIZE);
      drawFlowingLines(state, textLines, {
        font: regularFont,
        size: CERTIFICATE_BODY_SIZE,
        dotted: true,
        minLines: 2,
      });
      state.y -= 6;
      return;
    }

    const labeled = `${section.label}: ${section.text}`;
    const lines = certificateLines(labeled, width, regularFont, CERTIFICATE_BODY_SIZE);
    drawFlowingLines(state, lines, { font: regularFont, size: CERTIFICATE_BODY_SIZE });
    state.y -= 4;
  });
}

function drawCertificateIssueDate(state, issueDate) {
  const text = `Issued: ${formatCertificateDate(issueDate)}`;
  state.page.drawText(text, {
    x: state.layout.contentLeft,
    y: state.issueDateY,
    size: 11,
    font: state.fonts.regularFont,
    color: COLORS.text,
  });
}

export async function generateMedicalCertificatePDF({
  settings,
  createdAt,
  template,
  values,
} = {}) {
  const pdfDoc = await PDFDocument.create();
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const images = await loadPdfBrandingImages(pdfDoc);
  const layout = getPdfPageLayout();
  const fonts = { regularFont, boldFont };
  const safeSettings = settings ?? {};
  const state = createCertificateState(pdfDoc, layout, fonts);

  addCertificatePage(state, {
    withLetterhead: true,
    images,
    settings: safeSettings,
    createdAt,
  });
  drawCertificateTitle(state, template);
  drawCertificateSections(state, template, values ?? {});
  drawCertificateIssueDate(
    state,
    values?.certificateDate || String(createdAt ?? '').slice(0, 10)
  );
  drawPdfFooter(
    state.page,
    { regularFont },
    { signatureImage: images.signatureImage, sealImage: images.sealImage },
    {
      contentLeft: layout.contentLeft,
      contentWidth: layout.contentWidth,
      borderInset: layout.borderInset,
      contentPad: layout.contentPad,
    },
    safeSettings
  );

  return pdfDoc.save();
}

export async function downloadIssuedCertificatePDF(record) {
  const request = buildCertificatePdfRequest(record);

  if (!request.certificateNumber || !request.template?.blocks?.length) {
    throw new Error('This saved certificate does not include the details needed to recreate the PDF.');
  }

  return downloadMedicalCertificatePDF(request);
}

export async function downloadMedicalCertificatePDF({
  template,
  values,
  settings,
  certificateNumber,
}) {
  const createdAt = values?.certificateDate
    ? new Date(`${values.certificateDate}T00:00:00.000Z`).toISOString()
    : new Date().toISOString();
  const pdfBytes = await generateMedicalCertificatePDF({
    template,
    values,
    settings,
    createdAt,
  });
  const safeName = String(values?.patientName || 'patient')
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'patient';

  downloadPdf(pdfBytes, `medical_certificate_${safeName}_${certificateNumber || 'draft'}.pdf`);
}
