/** A face-down card: the classic swirl and gilded oval, for unrevealed sections. */
export default function CardBack({ className = "", label }: { className?: string; label?: string }) {
  return (
    <div className={`card-back ${className}`} role="img" aria-label={label ?? "A face-down card"}>
      <div className="card-back__body">
        <div className="card-back__face">
          <div className="card-back__oval">
            <svg viewBox="0 0 64 64" className="w-[44%] text-[#f2c14e]" aria-hidden="true">
              <defs>
                <radialGradient id="cardBackEye" cx="50%" cy="40%" r="60%">
                  <stop offset="0%" stopColor="#fff2b0" />
                  <stop offset="55%" stopColor="#f2c14e" />
                  <stop offset="100%" stopColor="#8a4d0c" />
                </radialGradient>
              </defs>
              <path
                d="M32 6l6.5 19.5L58 32l-19.5 6.5L32 58l-6.5-19.5L6 32l19.5-6.5z"
                fill="url(#cardBackEye)"
                stroke="#3a1a06"
                strokeWidth="1.5"
              />
              <circle cx="32" cy="32" r="6" fill="#3a1a06" />
              <circle cx="32" cy="32" r="3" fill="#ffdb7a" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
