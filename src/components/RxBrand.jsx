import RxIcon from './RxIcon';

/**
 * Primary RX identity block.
 * `.rx-brand-logo-slot` is reserved for a future custom logo beside the RX mark.
 */
function RxBrand({
  size = 'md',
  showLabel = false,
  label = 'Prescriptions',
  className = '',
}) {
  return (
    <div className={`rx-brand ${className}`.trim()}>
      <div className="rx-brand-mark">
        <div className="rx-brand-logo-slot" aria-hidden="true" title="Logo placeholder" />
        <div className="rx-brand-icon-wrap">
          <RxIcon size={size} />
        </div>
      </div>
      {showLabel && <span className="rx-brand-label">{label}</span>}
    </div>
  );
}

export default RxBrand;
