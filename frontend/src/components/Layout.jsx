import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet,
  CalendarClock,
  Users,
  ShieldCheck,
  LogOut,
  User as UserIcon,
  ListTodo,
  Globe,
  Check,
  Menu,
  X,
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import DigivideasFooter from "@/components/DigivideasFooter";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { DIGILOQ_LOGO, APP_TAGLINE } from "@/lib/branding";

const BASE_NAV = [
  { to: "/dashboard", label: "Genel Bakış", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/customers", label: "Müşteriler", icon: Users, testid: "nav-customers" },
  { to: "/receivables", label: "Gelirler", icon: ArrowDownToLine, testid: "nav-receivables" },
  { to: "/expenses", label: "Giderler", icon: ArrowUpFromLine, testid: "nav-expenses" },
  { to: "/is-akisi", label: "İş Akışı", icon: ListTodo, testid: "nav-workflow" },
  { to: "/payments", label: "Takvim & Ödemeler", icon: CalendarClock, testid: "nav-payments" },
  { to: "/accounts", label: "Banka Hesapları", icon: Wallet, testid: "nav-accounts" },
];

function AvatarChip({ user, size = 32 }) {
  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name}
        style={{ height: size, width: size }}
        className="rounded-xl object-cover border border-border"
      />
    );
  }
  return (
    <div
      style={{ height: size, width: size }}
      className="rounded-xl bg-secondary flex items-center justify-center shrink-0 border border-border"
    >
      <span className="font-mono text-sm font-bold text-brand">
        {(user?.name || "?").charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { activeCurrency, setActiveCurrency, rates } = useCurrency();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const NAV =
    user?.role === "owner"
      ? [
          ...BASE_NAV,
          { to: "/admin/users", label: "Yönetici Paneli", icon: ShieldCheck, testid: "nav-admin" },
        ]
      : BASE_NAV;

  const title =
    NAV.find((n) => n.to === location.pathname)?.label ||
    (location.pathname === "/profile" ? "Profil & Ayarlar" : "Genel Bakış");

  const doLogout = () => {
    logout();
    toast.success("Çıkış yapıldı");
    navigate("/", { replace: true });
  };

  return (
    <div className="h-screen max-h-screen w-full flex bg-background text-foreground overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex flex-col w-56 shrink-0 border-r border-border bg-[#141518] h-screen overflow-hidden"
        data-testid="app-sidebar"
      >
        <div className="px-4 py-3.5 flex items-center gap-2.5 border-b border-border shrink-0">
          <img src={DIGILOQ_LOGO} alt="Digiloq" className="h-7 w-auto" data-testid="sidebar-logo" />
          <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground leading-tight max-w-[100px]">
            {APP_TAGLINE}
          </div>
        </div>

        <nav className="flex-1 p-2.5 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/dashboard"}
                data-testid={item.testid}
                className={({ isActive }) =>
                  `group flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-150 ${
                    isActive
                      ? "bg-secondary text-foreground border border-border font-medium shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-2.5 border-t border-border space-y-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                data-testid="sidebar-user-btn"
                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-secondary/60 transition-colors text-left"
              >
                <AvatarChip user={user} size={30} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold truncate">{user?.name}</div>
                  <div className="text-[9px] text-muted-foreground uppercase tracking-[0.15em]">
                    {user?.role === "owner" ? "Sahibi" : "Üye"}
                  </div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="bg-card border-border w-52 rounded-xl">
              <DropdownMenuLabel className="text-xs text-muted-foreground truncate">
                {user?.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")} data-testid="menu-profile" className="rounded-lg">
                <UserIcon className="h-4 w-4 mr-2 text-brand" /> Profil & Ayarlar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={doLogout}
                data-testid="logout-btn"
                className="text-expense focus:text-expense rounded-lg"
              >
                <LogOut className="h-4 w-4 mr-2" /> Çıkış Yap
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DigivideasFooter className="justify-start px-1" />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/85 border-b border-border shrink-0">
          <div className="flex items-center justify-between px-3.5 sm:px-6 py-3">
            <div className="flex items-center gap-3">
              {/* Mobile Left Drawer Trigger (Hamburger) */}
              <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
                <SheetTrigger asChild>
                  <button
                    data-testid="mobile-hamburger-btn"
                    className="lg:hidden p-2 rounded-xl border border-border bg-card text-foreground hover:bg-secondary transition-colors"
                    aria-label="Menüyü Aç"
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72 bg-[#141518] border-r border-border flex flex-col justify-between">
                  <div>
                    <SheetHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img src={DIGILOQ_LOGO} alt="Digiloq" className="h-7 w-auto" />
                        <SheetTitle className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold">
                          {APP_TAGLINE}
                        </SheetTitle>
                      </div>
                    </SheetHeader>

                    {/* Mobile Navigation Links */}
                    <nav className="p-3 space-y-1">
                      {NAV.map((item) => {
                        const Icon = item.icon;
                        return (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === "/dashboard"}
                            data-testid={`drawer-${item.testid}`}
                            onClick={() => setMobileDrawerOpen(false)}
                            className={({ isActive }) =>
                              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                isActive
                                  ? "bg-secondary text-brand border border-border shadow-xs"
                                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                              }`
                            }
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span>{item.label}</span>
                          </NavLink>
                        );
                      })}
                    </nav>
                  </div>

                  {/* Drawer Footer User Info & Currency */}
                  <div className="p-3 border-t border-border space-y-3 bg-[#111215]">
                    <div className="flex items-center justify-between px-1">
                      <div className="text-[11px] text-muted-foreground">Kurlar:</div>
                      <div className="flex items-center gap-2 text-[11px] font-mono">
                        <span className="text-foreground/90 font-medium">USD {Number(rates?.USD || 38.50).toFixed(2)}₺</span>
                        <span className="text-border">|</span>
                        <span className="text-foreground/90 font-medium">EUR {Number(rates?.EUR || 41.80).toFixed(2)}₺</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div
                        onClick={() => {
                          setMobileDrawerOpen(false);
                          navigate("/profile");
                        }}
                        className="flex items-center gap-2 min-w-0 cursor-pointer flex-1"
                      >
                        <AvatarChip user={user} size={32} />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{user?.name}</div>
                          <div className="text-[9px] text-muted-foreground">{user?.email}</div>
                        </div>
                      </div>

                      <button
                        onClick={doLogout}
                        data-testid="drawer-logout-btn"
                        className="p-2 rounded-lg text-expense hover:bg-expense/10 transition-colors"
                        title="Çıkış Yap"
                      >
                        <LogOut className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <div>
                <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-semibold hidden sm:block">
                  Panel
                </div>
                <h1
                  className="font-display text-lg sm:text-xl font-bold tracking-tight"
                  data-testid="page-title"
                >
                  {title}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Live Currency Rates Ticker */}
              <div
                className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-xl border border-border bg-[#16181d] text-xs font-mono text-muted-foreground shadow-2xs select-none"
                title="Canlı Piyasa Döviz Kurları"
                data-testid="header-currency-ticker"
              >
                <div className="flex items-center gap-1 text-foreground/90 font-medium text-[11px]">
                  <span className="text-[9px] text-muted-foreground font-sans font-semibold">USD</span>
                  <span>{Number(rates?.USD || 38.50).toFixed(2)}₺</span>
                </div>
                <span className="text-border">|</span>
                <div className="flex items-center gap-1 text-foreground/90 font-medium text-[11px]">
                  <span className="text-[9px] text-muted-foreground font-sans font-semibold">EUR</span>
                  <span>{Number(rates?.EUR || 41.80).toFixed(2)}₺</span>
                </div>
              </div>

              {/* Quick Currency Selector in Header */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    data-testid="header-currency-switcher"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-border bg-card text-xs font-mono font-medium hover:border-zinc-700 transition-colors"
                  >
                    <Globe className="h-3.5 w-3.5 text-brand" />
                    <span>{activeCurrency}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card border-border w-36 rounded-xl">
                  <DropdownMenuLabel className="text-[9px] uppercase text-muted-foreground tracking-wider">
                    Para Birimi
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {["TRY", "USD", "EUR"].map((cur) => (
                    <DropdownMenuItem
                      key={cur}
                      onClick={() => setActiveCurrency(cur)}
                      data-testid={`switch-currency-${cur}`}
                      className="flex items-center justify-between font-mono text-xs cursor-pointer rounded-lg"
                    >
                      <span>
                        {cur === "TRY"
                          ? "TRY ₺"
                          : cur === "USD"
                          ? "USD $"
                          : "EUR €"}
                      </span>
                      {activeCurrency === cur && <Check className="h-3.5 w-3.5 text-brand" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <NotificationBell />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    data-testid="header-user-btn"
                    className="rounded-xl hover:opacity-80 transition-opacity"
                  >
                    <AvatarChip user={user} size={32} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card border-border w-52 rounded-xl">
                  <DropdownMenuLabel>
                    <div className="text-xs font-semibold">{user?.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{user?.email}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => navigate("/profile")}
                    data-testid="header-menu-profile"
                    className="rounded-lg"
                  >
                    <UserIcon className="h-4 w-4 mr-2 text-brand" /> Profil & Ayarlar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={doLogout}
                    data-testid="logout-btn-mobile"
                    className="text-expense focus:text-expense rounded-lg"
                  >
                    <LogOut className="h-4 w-4 mr-2" /> Çıkış Yap
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <div className="p-3.5 sm:p-4 lg:p-5 flex-1 overflow-y-auto max-w-7xl w-full mx-auto animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
