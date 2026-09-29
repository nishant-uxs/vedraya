import { useTheme } from "../../lib/ThemeProvider";
import "./ThemeToggle.css";

export function ThemeToggle() {
  const { preference, resolved, cycle, label } = useTheme();

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={cycle}
      aria-label={`${label}. Activate to switch. Currently ${resolved}.`}
      title={label}
    >
      <span className="theme-toggle__icon" aria-hidden>
        {preference === "system" ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
            <path d="M8 3V13" stroke="currentColor" strokeWidth="1.25" />
            <path d="M2 8H8" stroke="currentColor" strokeWidth="1.25" opacity="0.4" />
          </svg>
        ) : resolved === "dark" ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M13.5 9.2A5.5 5.5 0 0 1 6.8 2.5 5.6 5.6 0 1 0 13.5 9.2Z"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.25" />
            <path
              d="M8 1.5V3M8 13V14.5M1.5 8H3M13 8H14.5M3.4 3.4L4.5 4.5M11.5 11.5L12.6 12.6M12.6 3.4L11.5 4.5M4.5 11.5L3.4 12.6"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
            />
          </svg>
        )}
      </span>
      <span className="theme-toggle__sr">{label}</span>
    </button>
  );
}
