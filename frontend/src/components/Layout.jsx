import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet,
  CalendarClock,
  Users,
  RefreshCw,
  ShieldCheck,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import DigivideasFooter from "@/components/DigivideasFooter";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { DIGILOQ_LOGO, APP_TAGLINE } from "@/lib/branding";

const BASE_NAV = [
  { to: "/dashboard", label: "Genel Bakış", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/customers", label: "Müşteriler", icon: Users, testid: "nav-customers" },
  { to: "/receivables", label: "Alacaklar", icon: ArrowDownToLine, testid: "nav-receivables" },
  { to: "/fixed-expenses", label: "Aylık Sabit Giderler", icon: RefreshCw, testid: "nav-fixed-expenses" },
  { to: "/expenses", label: "Giderler", icon: ArrowUpFromLine, testid: "nav-expenses" },
  { to: "/accounts", label: "Banka Hesapları", icon: Wallet, testid: "nav-accounts" },
  { to: "/payments", label: "Yaklaşan Ödemeler", icon: CalendarClock, testid: "nav-payments" },
];

function AvatarChip({ user, size = 32 }) {
  if (user?.avatar) {
    return <img src={user.avatar} alt={user.name} style={{ height: size, width: size }} className="rounded-md object-cover border border-border" />;
  }
  return (
    <div style={{ height: size, width: size }} className="rounded-md bg-secondary flex items-center justify-center shrink-0 border border-border">
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

  const NAV = user?.role === "owner"
    ? [...BASE_NAV, { to: "/admin/users", label: "Üye Yönetimi", icon: ShieldCheck, testid: "nav-admin" }]
    : BASE_NAV;

  const title =
    NAV.find((n) => n.to === location.pathname)?.label ||
    (location.pathname === "/profile" ? "Profil" : "Genel Bakış");

  const doLogout = () => {
    logout();
    toast.success("Çıkış yapıldı");
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen w-full flex bg-background text-foreground">
      <aside
        className="hidden lg:flex flex-col w-64 shrink-0 border-r border-border bg-[#141518] sticky top-0 h-screen"
        data-testid="app-sidebar"
      >
        <div className="px-6 py-6 flex items-center gap-3 border-b border-border">
          <img src={DIGILOQ_LOGO} alt="Digiloq" className="h-9 w-auto" data-testid="sidebar-logo" />
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground leading-tight max-w-[110px]">
            {APP_TAGLINE}
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/dashboard"}
                data-testid={item.testid}
                className={({ isActive }) =>
                  `group flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors duration-200 ${
                    isActive
                      ? "bg-secondary text-foreground border border-border"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`
                }
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border space-y-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                data-testid="sidebar-user-btn"
                className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-secondary/60 transition-colors text-left"
              >
                <AvatarChip user={user} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{user?.name}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-[0.15em]">
                    {user?.role === "owner" ? "Sahibi" : "Üye"}
                  </div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="bg-card border-border w-56">
              <DropdownMenuLabel className="text-xs text-muted-foreground truncate">{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")} data-testid="menu-profile">
                <UserIcon className="h-4 w-4 mr-2" /> Profilim
              </DropdownMenuItem>
              <DropdownMenuItem onClick={doLogout} data-testid="logout-btn" className="text-expense focus:text-expense">
                <LogOut className="h-4 w-4 mr-2" /> Çıkış Yap
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DigivideasFooter className="justify-start px-1" />
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border">
          <div className="flex items-center justify-between px-4 md:px-8 py-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Panel</div>
              <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight" data-testid="page-title">
                {title}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <nav className="lg:hidden flex items-center gap-1 no-scrollbar overflow-x-auto max-w-[42vw]">
                {NAV.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === "/dashboard"}
                      data-testid={`m-${item.testid}`}
                      className={({ isActive }) =>
                        `p-2 rounded-md border transition-colors ${
                          isActive ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground"
                        }`
                      }
                    >
                      <Icon className="h-4 w-4" />
                    </NavLink>
                  );
                })}
              </nav>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button data-testid="header-user-btn" className="rounded-md hover:opacity-80 transition-opacity">
                    <AvatarChip user={user} size={36} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card border-border w-56">
                  <DropdownMenuLabel>
                    <div className="text-sm font-medium">{user?.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")} data-testid="header-menu-profile">
                    <UserIcon className="h-4 w-4 mr-2" /> Profilim
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={doLogout} data-testid="logout-btn-mobile" className="text-expense focus:text-expense">
                    <LogOut className="h-4 w-4 mr-2" /> Çıkış Yap
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        <div className="px-4 md:px-8 py-6 md:py-8 animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
