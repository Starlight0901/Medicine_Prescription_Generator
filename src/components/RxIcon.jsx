import { useEffect, useState } from 'react';
import { RX_ICON_PATH } from '../data/branding';
import { processRxIcon } from '../utils/rxIconProcessor';

const SIZES = {
  sm: 24,
  md: 32,
  lg: 48,
};

function RxIcon({ size = 'md', className = '' }) {
  const dimension = typeof size === 'number' ? size : SIZES[size] ?? SIZES.md;
  const [iconSrc, setIconSrc] = useState(RX_ICON_PATH);

  useEffect(() => {
    let cancelled = false;

    processRxIcon(RX_ICON_PATH)
      .then(({ dataUrl }) => {
        if (!cancelled) {
          setIconSrc(dataUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIconSrc(RX_ICON_PATH);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <img
      src={iconSrc}
      alt=""
      className={`rx-icon-img ${className}`.trim()}
      width={dimension}
      height={dimension}
      draggable={false}
    />
  );
}

export default RxIcon;
