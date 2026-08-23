import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";
import { DIGILOQ_LOGO, APP_TAGLINE } from "@/lib/branding";
import DigivideasFooter from "@/components/DigivideasFooter";
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
      toast.success("Hoş geldiniz");
      const to = location.state?.from?.pathname || "/dashboard";
      navigate(to, { replace: true });
    } catch (err) {
      setError(formatApiError(err, "Giriş başarısız"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-grid">
      <form
        onSubmit={submit}
        className="w-full max-w-md bg-card border border-border rounded-md p-8 space-y-6 animate-fade-in"
        data-testid="login-form"
      >
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity" data-testid="login-logo-home">
          <img src={DIGILOQ_LOGO} alt="Digiloq" className="h-12 w-auto" data-testid="digiloq-logo" />
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground max-w-[160px] leading-tight">
            {APP_TAGLINE}
          </div>
        </Link>

        <div>
          <div className="font-display text-3xl font-bold mb-1">Giriş Yap</div>
          <p className="text-sm text-muted-foreground">
            Hesabınız yok mu?{" "}
            <Link to="/register" className="text-brand hover:underline" data-testid="go-register">
              Kaydolun
            </Link>
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-posta</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@digiloq.com"
              data-testid="login-email"
              autoComplete="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Şifre</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              data-testid="login-password"
              autoComplete="current-password"
            />
          </div>
        </div>

        {error && (
          <div className="text-sm text-expense bg-expense/10 border border-expense/20 rounded-md p-3" data-testid="login-error">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          data-testid="login-submit"
          className="w-full bg-brand text-white hover:bg-brand/90 hover:-translate-y-[1px] transition-transform"
        >
          {loading ? "Giriş yapılıyor…" : "Giriş Yap"}
          <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </form>
      <div className="mt-8">
        <DigivideasFooter />
      </div>
    </div>
  );
}
