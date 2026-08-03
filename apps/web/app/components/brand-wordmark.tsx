type BrandWordmarkProps = { light?: boolean; compact?: boolean; className?: string };

export function BrandWordmark({
  light = false,
  compact = false,
  className = '',
}: BrandWordmarkProps) {
  const primary = light ? 'text-white' : 'text-[#092d83]';
  const secondary = light ? 'text-white/85' : 'text-[#e31b23]';
  const tagline = light ? 'text-white/65' : 'text-slate-500';
  return (
    <div className={`brand-wordmark ${compact ? 'brand-wordmark-compact' : ''} ${className}`}>
      <div className={`brand-wordmark-name ${primary}`}>EduKonekta</div>
      <div className={`brand-wordmark-product ${secondary}`}>School communication &amp; support</div>
      <div className={`brand-wordmark-tagline ${tagline}`}>JVerse for Education</div>
    </div>
  );
}
