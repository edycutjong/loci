// The Loci mark: a route through a room, three stations, the last one remembered.
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect x="2.5" y="2.5" width="27" height="27" rx="8" fill="none" stroke="#eef1fa" strokeWidth="2" />
      <path d="M8.5 21.5 L15.5 11.5 L23.5 19.5" fill="none" stroke="#8590b8" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="0.1 3.4" />
      <circle cx="8.5" cy="21.5" r="3" fill="#0e1534" stroke="#eef1fa" strokeWidth="1.8" />
      <circle cx="15.5" cy="11.5" r="3" fill="#0e1534" stroke="#eef1fa" strokeWidth="1.8" />
      <circle cx="23.5" cy="19.5" r="3.4" fill="#46d98a" />
    </svg>
  );
}
