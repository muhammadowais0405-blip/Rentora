interface RentoraLogoProps {
  variant?: 'light' | 'dark';
}

export function RentoraLogo({ variant = 'light' }: RentoraLogoProps) {
  const textColor = variant === 'dark' ? 'text-white' : 'text-[#172554]';

  return (
    <span className={`inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 ${textColor}`}>
      <svg
        width="28"
        height="28"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <path
          d="M7 5H19.5C23.6421 5 27 8.35786 27 12.5C27 16.0596 24.5198 19.0402 21.1904 19.8072L26.5 27H20.2L15.4 20.1H12V27H7V5ZM12 10V15.3H19C20.6569 15.3 22 14.0464 22 12.65C22 11.1864 20.6569 10 19 10H12Z"
          fill="url(#rentoraGrad)"
        />
        <defs>
          <linearGradient id="rentoraGrad" x1="7" y1="5" x2="27" y2="27" gradientUnits="userSpaceOnUse">
            <stop stopColor="#14B8A6" />
            <stop offset="1" stopColor={variant === 'dark' ? '#60A5FA' : '#172554'} />
          </linearGradient>
        </defs>
      </svg>
      <span className="font-display text-xl font-bold tracking-tight">Rentora</span>
    </span>
  );
}
