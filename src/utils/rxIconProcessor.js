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

function canvasToPngBytes(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((result) => {
      if (!result) {
        reject(new Error('Unable to convert canvas to PNG.'));
        return;
      }
      resolve(result);
    }, 'image/png');
  }).then((blob) => blob.arrayBuffer()).then((buffer) => new Uint8Array(buffer));
}

function canvasToDataUrl(canvas) {
  return canvas.toDataURL('image/png');
}

function normalizeIconPixels(imageData, mode = 'direct') {
  const { data } = imageData;
  let visiblePixels = 0;

  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3];
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];

    if (mode === 'invert') {
      const invertedRed = 255 - red;
      const invertedGreen = 255 - green;
      const invertedBlue = 255 - blue;

      if (invertedRed > 245 && invertedGreen > 245 && invertedBlue > 245) {
        data[index + 3] = 0;
        continue;
      }

      visiblePixels += 1;
      data[index] = 25;
      data[index + 1] = 25;
      data[index + 2] = 25;
      data[index + 3] = 255;
      continue;
    }

    if (alpha < 10) {
      data[index + 3] = 0;
      continue;
    }

    const luminance = (red + green + blue) / 3;

    if (luminance < 220) {
      visiblePixels += 1;
      data[index] = 20;
      data[index + 1] = 20;
      data[index + 2] = 20;
      data[index + 3] = 255;
      continue;
    }

    data[index + 3] = 0;
  }

  return visiblePixels;
}

export async function processRxIcon(iconUrl) {
  const image = await loadImageElement(iconUrl);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  let imageData = context.getImageData(0, 0, width, height);
  let visiblePixels = normalizeIconPixels(imageData, 'direct');

  if (visiblePixels === 0) {
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    imageData = context.getImageData(0, 0, width, height);
    normalizeIconPixels(imageData, 'invert');
  }

  context.putImageData(imageData, 0, 0);

  const [pngBytes, dataUrl] = await Promise.all([
    canvasToPngBytes(canvas),
    Promise.resolve(canvasToDataUrl(canvas)),
  ]);

  return { pngBytes, dataUrl };
}
