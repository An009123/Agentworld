export function Mark({ size = 36 }: { size?: number }) {
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="#F0B90B" />
      <circle cx="16.4" cy="20" r="7" fill="none" stroke="#0B0E11" strokeWidth="2.1" />
      <circle cx="24" cy="20" r="7" fill="none" stroke="#0B0E11" strokeWidth="2.1" />
      <circle cx="20.2" cy="20" r="1.7" fill="#0B0E11" />
    </svg>
  );
}
