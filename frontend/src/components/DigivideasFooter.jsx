import { DIGIVIDEAS_LOGO, DIGIVIDEAS_URL } from "@/lib/branding";

export default function DigivideasFooter({ className = "" }) {
  return (
    <a
      href={DIGIVIDEAS_URL}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="digivideas-footer-link"
      className={`inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-brand transition-colors ${className}`}
    >
      <span className="tracking-wide">Digivideas tarafından oluşturulmuştur</span>
      <img src={DIGIVIDEAS_LOGO} alt="Digivideas" className="h-4 w-auto opacity-90 group-hover:opacity-100" />
    </a>
  );
}
