/** The mark of the currency: a struck coin with an E on its face. */
export default function ElectrumCoin({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`electrum-coin ${className}`} aria-hidden="true">
      <circle cx="12" cy="12" r="10.5" className="electrum-coin__rim" />
      <circle cx="12" cy="12" r="7.6" className="electrum-coin__face" />
      <path d="M14.6 8.6H10v6.8h4.6M10 12h3.6M12 6.9v1.7M12 15.4v1.7" className="electrum-coin__mark" />
    </svg>
  );
}
