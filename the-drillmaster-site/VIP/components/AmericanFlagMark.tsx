type AmericanFlagMarkProps = { className?: string; size?: number };

export function AmericanFlagMark({ className, size = 36 }: AmericanFlagMarkProps) {
  return <svg className={className} width={size} height={size * 34 / 44} viewBox="0 0 44 34" fill="none" aria-hidden="true" focusable="false">
    <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="3.5" width="37" height="27" rx="4.5" />
      <path d="M20 4v14H4M20 10.5h20M20 17h20M4 23.5h36" />
    </g>
    <g fill="currentColor">
      <path d="m9 6.5.7 1.7 1.8.1-1.4 1.2.5 1.8L9 10.4l-1.6.9.5-1.8-1.4-1.2 1.8-.1Z" />
      <path d="m15.5 6.5.7 1.7 1.8.1-1.4 1.2.5 1.8-1.6-.9-1.6.9.5-1.8-1.4-1.2 1.8-.1Z" />
      <path d="m12.25 11.5.7 1.7 1.8.1-1.4 1.2.5 1.8-1.6-.9-1.6.9.5-1.8-1.4-1.2 1.8-.1Z" />
    </g>
  </svg>;
}
