export const CHARS_PER_LINE = 85;
export const LINE_HEIGHT = 15;
export const APPROX_LINES_FIRST_PAGE = 38;
export const APPROX_LINES_OTHER_PAGES = 50;

function estimateWrappedLineCount(textLine) {
  if (textLine.trim() === '') {
    return 1;
  }

  return Math.max(1, Math.ceil(textLine.length / CHARS_PER_LINE));
}

export function countEstimatedReferralLines(referralContent) {
  const rawLines = String(referralContent ?? '').split('\n');

  if (rawLines.length === 1 && rawLines[0] === '') {
    return 0;
  }

  return rawLines.reduce((total, rawLine) => total + estimateWrappedLineCount(rawLine), 0);
}

export function estimateReferralPages(referralContent) {
  const estimatedLines = countEstimatedReferralLines(referralContent);

  if (estimatedLines === 0) {
    return { estimatedPages: 1, estimatedLines: 0 };
  }

  if (estimatedLines <= APPROX_LINES_FIRST_PAGE) {
    return { estimatedPages: 1, estimatedLines };
  }

  const remainingLines = estimatedLines - APPROX_LINES_FIRST_PAGE;
  const additionalPages = Math.ceil(remainingLines / APPROX_LINES_OTHER_PAGES);

  return {
    estimatedPages: 1 + additionalPages,
    estimatedLines,
  };
}

export function formatReferralPageEstimate({ estimatedPages, estimatedLines }) {
  const pageWord = estimatedPages === 1 ? 'page' : 'pages';
  const lineWord = estimatedLines === 1 ? 'line' : 'lines';

  return {
    pageLabel: `Estimated PDF Length: ${estimatedPages} ${pageWord}`,
    linesLabel: `Approx. ${estimatedLines} ${lineWord}`,
  };
}
