export default function Logo({ size = 90 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 120 96" aria-label="Genesis Virtue">
      <ellipse cx="60" cy="34" rx="44" ry="17" fill="none" stroke="#4aa3d6" strokeWidth="2.5" transform="rotate(-18 60 34)" />
      <ellipse cx="60" cy="34" rx="38" ry="14" fill="none" stroke="#0f2a43" strokeWidth="2" transform="rotate(14 60 34)" />
      <circle cx="98" cy="18" r="3.5" fill="#0f2a43" />
      <text x="60" y="44" textAnchor="middle" fontSize="30" fontWeight="700" fill="#0f2a43" fontFamily="Inter, sans-serif">G</text>
      <text x="60" y="84" textAnchor="middle" fontSize="15" fontWeight="700" fill="#0f2a43" fontFamily="Inter, sans-serif" letterSpacing="0.5">GENESISVIRTUE</text>
    </svg>
  );
}
