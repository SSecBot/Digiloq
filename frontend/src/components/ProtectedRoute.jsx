import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({ children, ownerOnly = false }) {
  const { user, checking } = useAuth();
  const location = useLocation();

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Yükleniyor…
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (ownerOnly && user.role !== "owner") {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
