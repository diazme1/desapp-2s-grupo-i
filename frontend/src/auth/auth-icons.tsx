type IconProps = {
  className?: string
}

export function BrandMark({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 56 56" aria-hidden="true">
      <path d="M7 45V28a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v17H7Z" fill="currentColor" />
      <path d="M22 45V17a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v28H22Z" fill="currentColor" />
      <path d="M37 45V8a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v37H37Z" fill="currentColor" />
      <circle cx="40.5" cy="12.5" r="9.5" fill="var(--logo-ball, #fff)" stroke="currentColor" strokeWidth="2" />
      <path d="m40.5 7.5 2 3 3.5.7-2.4 2.7.4 3.5-3.5-1.4-3.3 1.4.4-3.5-2.4-2.7 3.5-.7 2-3Z" fill="currentColor" />
    </svg>
  )
}

export function MailIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m5 7 7 5.5L19 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function LockIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="15" r="1.2" fill="currentColor" />
    </svg>
  )
}

export function EyeIcon({ className, hidden = false }: IconProps & { hidden?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2.8 12s3.2-5 9.2-5 9.2 5 9.2 5-3.2 5-9.2 5-9.2-5-9.2-5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      {!hidden && <circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.8" />}
      {hidden && <path d="m4 4 16 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />}
    </svg>
  )
}

export function TrendIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 17 10 11l4 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 7h5v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ExchangeIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 7h9l-2.5-2.5M17 17H8l2.5 2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m16 7 2 2-2 2M8 17l-2-2 2-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function PortfolioIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 20V12M12 20V7M19 20V4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
