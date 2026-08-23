import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  LayoutDashboard,
  Users,
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet,
  CalendarClock,
  RefreshCw,
  ShieldCheck,
  Bell,
  CheckCircle2,
  Sparkles,
  Mail,
  Globe,
  Gift,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { DIGILOQ_LOGO, DIGIVIDEAS_LOGO, DIGIVIDEAS_URL, APP_TAGLINE } from "@/lib/branding";

const FEATURES = [
  { icon: LayoutDashboard, title: "Tek Ekran Genel Bakış", desc: "Toplam bakiye, bekleyen alacaklar, giderler ve vadesi geçen kalemleri anında görün. 30 günlük nakit akış projeksiyon grafiği ile geleceği önceden okuyun." },
  { icon: Users, title: "Müşteri & Tekrarlı Gelirler", desc: "Her müşteri için aylık tekrarlı gelir tanımlayın; sistem otomatik 12 ay alacak kaydı oluşturur ve Alacaklar sekmesinde görünür." },
  { icon: RefreshCw, title: "Aylık Sabit Giderler", desc: "Kira, maaş, aidat gibi sabit giderleri tanımlayın; her ay otomatik gider üretilir. Ay bazlı görüntüleme ile bütçeyi net planlayın." },
  { icon: ArrowDownToLine, title: "Alacaklar Yönetimi", desc: "Tek tıkla tahsil edildi olarak işaretleyin; bağlı banka hesabına bakiye otomatik yansır. Vadesi geçenler otomatik olarak işaretlenir." },
  { icon: ArrowUpFromLine, title: "Giderler Yönetimi", desc: "Kategori, tarih, ödeme hesabı ile giderlerinizi anlık takip edin. Ay bazlı filtre ve durum takibi sayesinde hiçbir ödeme kaçmaz." },
  { icon: Wallet, title: "Banka Hesapları", desc: "TRY, USD, EUR — birden fazla hesap ve para birimini yönetin. Alacaklar tahsil edildiğinde artar, giderler ödendiğinde düşer." },
  { icon: CalendarClock, title: "Yaklaşan Ödemeler Takvimi", desc: "Türkçe takvim üzerinde hangi günde ne var, tek bakışta görün. Gün seçin, listeyi görün, tek tıkla kapatın." },
  { icon: Bell, title: "Bildirim Merkezi", desc: "Vadesi geçen alacak ve giderler için üst çubukta anlık uyarı. Tek tıkla tahsil et / öde ile hızlı aksiyon alın." },
  { icon: ShieldCheck, title: "Çok Kullanıcılı & Güvenli", desc: "Kayıt olan üyeler yönetici onayına düşer. Her üyenin verisi tamamen izole; sadece siz kendi verinizi görürsünüz." },
];

const STEPS = [
  { n: "01", t: "Kaydolun", d: "E-postanız ve şifrenizle 30 saniyede hesap açın." },
  { n: "02", t: "Onayı bekleyin", d: "Yönetici hesabınızı onayladığında giriş yapabilirsiniz." },
  { n: "03", t: "Kurun", d: "Banka hesabı, müşteri ve sabit giderlerinizi bir kez tanımlayın." },
  { n: "04", t: "Rahatlayın", d: "Panel her ay otomatik güncellenir; siz sadece işaretleyin." },
];

const HIGHLIGHTS = [
  "Çoklu para birimi (TRY, USD, EUR)", "Aylık ay-bazlı görüntüleme", "12 ay otomatik tekrarlı kayıt",
  "Vadesi geçmiş otomatik takibi", "Bakiye otomatik güncelleme", "Türkçe arayüz ve tarih formatı",
];

// ============= DEMO DATA =============
const DEMO_RECEIVABLES = [
  { c: "ABC Ltd.", d: "25 Ağu", a: "+₺12.500", s: "Bekliyor", cls: "text-warn bg-warn/10 border-warn/20" },
  { c: "Yıldız A.Ş.", d: "18 Ağu", a: "+₺8.750", s: "Vadesi Geçti", cls: "text-expense bg-expense/10 border-expense/20" },
  { c: "Kaya İnşaat", d: "10 Eyl", a: "+₺22.000", s: "Bekliyor", cls: "text-warn bg-warn/10 border-warn/20" },
  { c: "Deniz Studio", d: "01 Ağu", a: "+₺5.400", s: "Ödendi", cls: "text-income bg-income/10 border-income/20" },
];

const DEMO_EXPENSES = [
  { t: "Ofis Kirası", cat: "Kira", d: "01 Eyl", a: "−₺15.000", s: "Bekliyor", cls: "text-warn bg-warn/10 border-warn/20" },
  { t: "SaaS Abonelikleri", cat: "Yazılım", d: "05 Eyl", a: "−₺2.150", s: "Bekliyor", cls: "text-warn bg-warn/10 border-warn/20" },
  { t: "Personel Maaşı", cat: "Personel", d: "10 Eyl", a: "−₺48.000", s: "Bekliyor", cls: "text-warn bg-warn/10 border-warn/20" },
  { t: "Elektrik/Su", cat: "Elektrik/Su", d: "28 Ağu", a: "−₺1.240", s: "Ödendi", cls: "text-income bg-income/10 border-income/20" },
];

const DEMO_CUSTOMERS = [
  { name: "ABC Ltd.", amount: "+₺12.500", day: 25 },
  { name: "Yıldız A.Ş.", amount: "+₺8.750", day: 18 },
  { name: "Kaya İnşaat", amount: "+₺22.000", day: 10 },
];

function DemoBar({ tab, setTab }) {
  const items = [
    { k: "dashboard", label: "Genel Bakış", icon: LayoutDashboard },
    { k: "customers", label: "Müşteriler", icon: Users },
    { k: "receivables", label: "Alacaklar", icon: ArrowDownToLine },
    { k: "expenses", label: "Giderler", icon: ArrowUpFromLine },
    { k: "payments", label: "Yaklaşan", icon: CalendarClock },
  ];
  return (
    <div className="flex gap-1 p-1 bg-secondary/50 rounded-md border border-border overflow-x-auto no-scrollbar">
      {items.map((it) => {
        const Icon = it.icon;
        const active = tab === it.k;
        return (
          <button
            key={it.k}
            onClick={() => setTab(it.k)}
            data-testid={`demo-tab-${it.k}`}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-colors whitespace-nowrap ${
              active ? "bg-brand text-white" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

function DemoDashboard() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-border rounded-md p-3">
          <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Toplam Bakiye</div>
          <div className="font-mono text-lg font-bold mt-1">₺124.800</div>
        </div>
        <div className="border border-border rounded-md p-3">
          <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Bekleyen Alacak</div>
          <div className="font-mono text-lg font-bold text-income mt-1">+₺48.500</div>
        </div>
        <div className="border border-border rounded-md p-3">
          <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Bekleyen Gider</div>
          <div className="font-mono text-lg font-bold text-expense mt-1">−₺65.150</div>
        </div>
        <div className="border border-border rounded-md p-3">
          <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Vadesi Geçen</div>
          <div className="font-mono text-lg font-bold text-warn mt-1">₺8.750</div>
        </div>
      </div>
      <div className="border border-border rounded-md p-4 h-40">
        <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-2">30 Gün · Bakiye Projeksiyonu</div>
        <svg viewBox="0 0 300 100" className="w-full h-24" preserveAspectRatio="none">
          <defs>
            <linearGradient id="demoArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F97316" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,70 C40,60 60,50 90,45 C120,40 150,55 180,40 C210,25 240,20 300,10 L300,100 L0,100 Z" fill="url(#demoArea)" />
          <path d="M0,70 C40,60 60,50 90,45 C120,40 150,55 180,40 C210,25 240,20 300,10" fill="none" stroke="#F97316" strokeWidth="2" />
        </svg>
      </div>
    </div>
  );
}

function DemoCustomers() {
  return (
    <div className="grid grid-cols-1 gap-3 animate-fade-in">
      {DEMO_CUSTOMERS.map((c) => (
        <div key={c.name} className="border border-border rounded-md p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-brand/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-brand" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{c.name}</div>
            <div className="text-[11px] text-muted-foreground">Ayın {c.day}. günü · Aylık tekrarlı</div>
          </div>
          <div className="font-mono font-semibold text-income">{c.amount}</div>
        </div>
      ))}
      <div className="text-[11px] text-muted-foreground text-center pt-1">
        <RefreshCw className="h-3 w-3 inline mr-1 text-brand" /> Her ay için 12 ay ileriye kadar otomatik alacak oluşur
      </div>
    </div>
  );
}

function DemoRows({ rows, iconType }) {
  const Icon = iconType === "in" ? ArrowDownToLine : ArrowUpFromLine;
  const cls = iconType === "in" ? "text-income bg-income/10" : "text-expense bg-expense/10";
  return (
    <div className="space-y-2 animate-fade-in">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-3 border border-border rounded-md p-3">
          <div className={`h-8 w-8 rounded-md flex items-center justify-center ${cls}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{r.c || r.t}</div>
            <div className="text-[11px] text-muted-foreground">{r.cat ? `${r.cat} · ${r.d}` : r.d}</div>
          </div>
          <div className={`text-xs px-2 py-1 rounded-sm border ${r.cls}`}>{r.s}</div>
          <div className={`font-mono font-semibold text-sm ${iconType === "in" ? "text-income" : "text-expense"}`}>{r.a}</div>
        </div>
      ))}
    </div>
  );
}

function DemoPayments() {
  const days = [
    { d: 25, has: true, hi: false }, { d: 26, has: false, hi: false }, { d: 27, has: false, hi: false },
    { d: 28, has: true, hi: false }, { d: 29, has: false, hi: false }, { d: 30, has: false, hi: false }, { d: 31, has: false, hi: false },
    { d: 1, has: true, hi: false }, { d: 2, has: false, hi: false }, { d: 3, has: false, hi: false },
    { d: 4, has: false, hi: false }, { d: 5, has: true, hi: true }, { d: 6, has: false, hi: false }, { d: 7, has: false, hi: false },
    { d: 8, has: false, hi: false }, { d: 9, has: false, hi: false }, { d: 10, has: true, hi: false },
    { d: 11, has: false, hi: false }, { d: 12, has: false, hi: false }, { d: 13, has: false, hi: false }, { d: 14, has: false, hi: false },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 animate-fade-in">
      <div className="border border-border rounded-md p-3">
        <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Eylül 2026</div>
        <div className="grid grid-cols-7 gap-1">
          {["P","S","Ç","P","C","C","P"].map((d, i) => (
            <div key={i} className="text-[9px] text-center text-muted-foreground pb-1">{d}</div>
          ))}
          {days.map((d, i) => (
            <div key={i} className={`aspect-square rounded flex items-center justify-center relative text-[10px] font-mono ${d.hi ? "bg-brand text-white" : "border border-border text-foreground"}`}>
              {d.d}
              {d.has && !d.hi && <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-brand" />}
            </div>
          ))}
        </div>
      </div>
      <div className="border border-border rounded-md p-3 space-y-2">
        <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">05 Eylül 2026</div>
        <div className="border border-border rounded-md p-2 flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-expense/10 flex items-center justify-center">
            <ArrowUpFromLine className="h-3 w-3 text-expense" />
          </div>
          <div className="text-xs flex-1 min-w-0 truncate">SaaS Abonelikleri</div>
          <div className="text-xs font-mono text-expense">−₺2.150</div>
        </div>
        <div className="border border-border rounded-md p-2 flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-income/10 flex items-center justify-center">
            <ArrowDownToLine className="h-3 w-3 text-income" />
          </div>
          <div className="text-xs flex-1 min-w-0 truncate">Kaya İnşaat</div>
          <div className="text-xs font-mono text-income">+₺22.000</div>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const [demoTab, setDemoTab] = useState("dashboard");

  const renderDemo = () => {
    switch (demoTab) {
      case "customers": return <DemoCustomers />;
      case "receivables": return <DemoRows rows={DEMO_RECEIVABLES} iconType="in" />;
      case "expenses": return <DemoRows rows={DEMO_EXPENSES} iconType="out" />;
      case "payments": return <DemoPayments />;
      default: return <DemoDashboard />;
    }
  };

  const demoTitle = {
    dashboard: "Genel Bakış",
    customers: "Müşteriler",
    receivables: "Alacaklar",
    expenses: "Giderler",
    payments: "Yaklaşan Ödemeler",
  }[demoTab];

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="landing-page">
      {/* Marquee free banner */}
      <div className="bg-brand text-white overflow-hidden border-b border-brand/60" data-testid="free-banner">
        <div className="whitespace-nowrap animate-marquee text-xs font-semibold tracking-wide py-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className="mx-6 inline-flex items-center gap-2">
              <Gift className="h-3 w-3 inline" />
              SİSTEM TAMAMEN ÜCRETSİZ · HEMEN KAYIT OLUN
              <Sparkles className="h-3 w-3 inline" />
            </span>
          ))}
        </div>
      </div>

      {/* NAV */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 md:px-8 py-4">
          <Link to="/" data-testid="landing-brand" className="flex items-center gap-3">
            <img src={DIGILOQ_LOGO} alt="Digiloq" className="h-9 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            <a href="#features" data-testid="nav-features" className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-brand transition-colors">Neler Sunar?</a>
            <a href="#how" data-testid="nav-how" className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-brand transition-colors">Nasıl Çalışır?</a>
            <a href="#contact" data-testid="nav-contact" className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-brand transition-colors">İletişim</a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Link to="/dashboard" data-testid="landing-go-dashboard" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-brand text-white text-sm font-medium hover:bg-brand/90 hover:-translate-y-[1px] transition-transform">
                Panele Git <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link to="/login" data-testid="landing-login" className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground border border-transparent hover:border-border transition-colors">
                  Üye Girişi
                </Link>
                <Link to="/register" data-testid="landing-register" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-brand text-white text-sm font-medium hover:bg-brand/90 hover:-translate-y-[1px] transition-transform">
                  Kayıt Ol <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO with interactive demo */}
      <section className="relative overflow-hidden scroll-mt-24">
        <div className="absolute inset-0 bg-grid opacity-60 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-16 md:pt-24 pb-16 md:pb-24 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in">
              <div className="inline-flex items-center gap-2 border border-brand/30 bg-brand/5 text-brand rounded-full px-3 py-1 text-xs font-medium mb-6">
                <Sparkles className="h-3 w-3" />
                <span>Küçük işletmeler için nakit akış paneli</span>
              </div>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">
                Nakit akışını{" "}
                <span className="text-brand">tek ekrandan</span>{" "}
                yönetin.
              </h1>
              <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-xl">
                <span className="text-foreground font-semibold">Digiloq</span> — {APP_TAGLINE}. Alacaklar, giderler,
                banka hesapları, aylık tekrarlı kayıtlar ve yaklaşan ödemeler artık dağınık değil. Hepsi tek panelde,
                Türkçe, çoklu para birimi ile.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/register" data-testid="hero-try-btn" className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-brand text-white font-semibold hover:bg-brand/90 hover:-translate-y-[1px] transition-transform">
                  Ücretsiz Deneyin <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/login" data-testid="hero-login-btn" className="inline-flex items-center gap-2 px-6 py-3 rounded-md border border-border text-foreground font-semibold hover:border-brand hover:text-brand transition-colors">
                  Üye Girişi
                </Link>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-2 max-w-lg">
                {HIGHLIGHTS.map((h) => (
                  <div key={h} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-brand shrink-0" />
                    {h}
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive demo */}
            <div className="relative animate-fade-in" data-testid="demo-panel">
              <div className="absolute -inset-6 bg-brand/10 blur-3xl rounded-full pointer-events-none" />
              <div className="relative bg-card border border-border rounded-lg shadow-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="h-2.5 w-2.5 rounded-full bg-expense" />
                      <div className="h-2.5 w-2.5 rounded-full bg-warn" />
                      <div className="h-2.5 w-2.5 rounded-full bg-income" />
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-2">Canlı Demo</div>
                  </div>
                  <div className="text-[10px] text-brand font-medium">İnteraktif</div>
                </div>
                <div className="p-4 space-y-4">
                  <DemoBar tab={demoTab} setTab={setDemoTab} />
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Panel</div>
                      <div className="font-display text-xl font-bold">{demoTitle}</div>
                    </div>
                  </div>
                  <div className="min-h-[280px]">{renderDemo()}</div>
                </div>
              </div>
              <div className="text-center mt-3 text-xs text-muted-foreground">
                👆 Sekmelere tıklayarak demo panelde gezinin
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-24 scroll-mt-24">
        <div className="max-w-2xl mb-12">
          <div className="text-[10px] uppercase tracking-[0.25em] text-brand font-semibold mb-3">Neler Sunar?</div>
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
            Nakit akışını yönetmek için ihtiyacınız olan her şey — daha fazlası değil.
          </h2>
          <p className="text-muted-foreground mt-4">
            Tekrarlı gelirler, sabit giderler, çoklu banka hesapları ve vade takibini otomatikleştirir.
            Siz sadece işaretler ve büyümeye odaklanırsınız.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="bg-card border border-border rounded-md p-6 hover:border-brand/40 hover:-translate-y-0.5 transition-all duration-200 group" data-testid={`feature-${i}`}>
                <div className="h-10 w-10 rounded-md bg-brand/10 flex items-center justify-center mb-4 group-hover:bg-brand/20 transition-colors">
                  <Icon className="h-5 w-5 text-brand" strokeWidth={2} />
                </div>
                <div className="font-display font-bold text-lg mb-2">{f.title}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-24 border-t border-border scroll-mt-24">
        <div className="max-w-2xl mb-12">
          <div className="text-[10px] uppercase tracking-[0.25em] text-brand font-semibold mb-3">Nasıl Çalışır?</div>
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">4 adımda ilk günden verimli.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map((s) => (
            <div key={s.n} className="bg-card border border-border rounded-md p-6">
              <div className="font-mono text-3xl font-bold text-brand mb-3">{s.n}</div>
              <div className="font-display font-bold text-lg mb-1">{s.t}</div>
              <div className="text-sm text-muted-foreground leading-relaxed">{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-24">
        <div className="relative bg-card border border-border rounded-lg p-8 md:p-14 overflow-hidden">
          <div className="absolute -top-20 -right-20 h-64 w-64 bg-brand/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative grid grid-cols-1 md:grid-cols-3 items-center gap-6">
            <div className="md:col-span-2">
              <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
                Bugün başlayın, dağınıklığa son verin.
              </h2>
              <p className="text-muted-foreground mt-3 max-w-2xl">
                30 saniyede kayıt olun. Yöneticinin onayından sonra kendi izole panelinizi kullanmaya başlayın.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <Link to="/register" data-testid="cta-register" className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-brand text-white font-semibold hover:bg-brand/90 hover:-translate-y-[1px] transition-transform">
                Ücretsiz Deneyin <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/login" data-testid="cta-login" className="inline-flex items-center gap-2 px-6 py-3 rounded-md border border-border text-foreground font-semibold hover:border-brand hover:text-brand transition-colors">
                Üye Girişi
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT & FOOTER */}
      <footer id="contact" className="border-t border-border scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <img src={DIGILOQ_LOGO} alt="Digiloq" className="h-9 w-auto" />
            <p className="text-sm text-muted-foreground max-w-sm">
              {APP_TAGLINE}. Küçük işletmelerin nakit akışını sadeleştirmek için tasarlandı.
            </p>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-semibold mb-4">İletişim</div>
            <div className="space-y-2 text-sm">
              <a href="mailto:info@digivideas.com" data-testid="footer-email" className="inline-flex items-center gap-2 text-foreground hover:text-brand transition-colors">
                <Mail className="h-4 w-4" /> info@digivideas.com
              </a>
              <a href={DIGIVIDEAS_URL} target="_blank" rel="noopener noreferrer" data-testid="footer-website" className="inline-flex items-center gap-2 text-foreground hover:text-brand transition-colors">
                <Globe className="h-4 w-4" /> www.digivideas.com
              </a>
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-semibold mb-4">Bağlantılar</div>
            <div className="space-y-2 text-sm">
              <Link to="/login" className="block text-foreground hover:text-brand transition-colors">Üye Girişi</Link>
              <Link to="/register" className="block text-foreground hover:text-brand transition-colors">Kayıt Ol</Link>
              <a href="#features" className="block text-foreground hover:text-brand transition-colors">Neler Sunar?</a>
              <a href="#how" className="block text-foreground hover:text-brand transition-colors">Nasıl Çalışır?</a>
            </div>
          </div>
        </div>
        <div className="border-t border-border">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Digiloq — Tüm hakları saklıdır.
            </div>
            <a href={DIGIVIDEAS_URL} target="_blank" rel="noopener noreferrer" data-testid="footer-digivideas-link" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-brand transition-colors">
              <span>Digivideas tarafından oluşturulmuştur</span>
              <img src={DIGIVIDEAS_LOGO} alt="Digivideas" className="h-5 w-auto" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
