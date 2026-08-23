import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { DIGILOQ_LOGO, APP_TAGLINE } from "@/lib/branding";
import DigivideasFooter from "@/components/DigivideasFooter";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Şifre en az 8 karakter olmalı");
    setLoading(true);
    try {
      await register(email.trim(), password, name.trim());
      setDone(true);
      toast.success("Kaydınız alındı");
    } catch (err) {
      setError(formatApiError(err, "Kayıt başarısız"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-grid">
      <div className="w-full max-w-md bg-card border border-border rounded-md p-8 space-y-6 animate-fade-in">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity" data-testid="register-logo-home">
          <img src={DIGILOQ_LOGO} alt="Digiloq" className="h-12 w-auto" />
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground max-w-[160px] leading-tight">
            {APP_TAGLINE}
          </div>
        </Link>

        {done ? (
          <div className="space-y-4 text-center py-4" data-testid="register-success">
            <div className="mx-auto h-14 w-14 rounded-full bg-income/10 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-income" />
            </div>
            <div>
              <div className="font-display text-2xl font-bold">Kaydınız Alındı</div>
              <p className="text-sm text-muted-foreground mt-1">
                Hesabınız <span className="text-foreground font-medium">onay bekliyor</span>. Yönetici onayı sonrasında giriş yapabilirsiniz.
              </p>
            </div>
            <Button onClick={() => navigate("/login")} variant="outline" className="w-full" data-testid="register-go-login">
              Giriş sayfasına dön
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-6" data-testid="register-form">
            <div>
              <div className="font-display text-3xl font-bold mb-1">Kaydol</div>
              <p className="text-sm text-muted-foreground">
                Zaten hesabınız var mı?{" "}
                <Link to="/login" className="text-brand hover:underline" data-testid="go-login">
                  Giriş yapın
                </Link>
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Ad Soyad</Label>
                <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ali Veli" data-testid="register-name" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">E-posta</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@digiloq.com" data-testid="register-email" autoComplete="email" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Şifre (en az 8 karakter)</Label>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" data-testid="register-password" autoComplete="new-password" />
              </div>
            </div>
            {error && (
              <div className="text-sm text-expense bg-expense/10 border border-expense/20 rounded-md p-3" data-testid="register-error">
                {error}
              </div>
            )}
            <Button type="submit" disabled={loading} data-testid="register-submit" className="w-full bg-brand text-white hover:bg-brand/90 hover:-translate-y-[1px] transition-transform">
              {loading ? "Gönderiliyor…" : "Kaydol"}
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
            <div className="text-[11px] text-muted-foreground text-center">
              Kayıt sonrası hesabınız yönetici onayına düşer.
            </div>
          </form>
        )}
      </div>
      <div className="mt-8">
        <DigivideasFooter />
      </div>
    </div>
  );
}
