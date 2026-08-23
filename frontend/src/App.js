import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Receivables from "@/pages/Receivables";
import Expenses from "@/pages/Expenses";
import Accounts from "@/pages/Accounts";
import Payments from "@/pages/Payments";
import Customers from "@/pages/Customers";
import FixedExpenses from "@/pages/FixedExpenses";
import AdminUsers from "@/pages/AdminUsers";
import Profile from "@/pages/Profile";

function App() {
  return (
    <div className="App dark">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/receivables" element={<Receivables />} />
              <Route path="/fixed-expenses" element={<FixedExpenses />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/profile" element={<Profile />} />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute ownerOnly>
                    <AdminUsers />
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={{
          style: {
            background: "#141518",
            border: "1px solid #2a2d33",
            color: "#fafafa",
          },
        }}
      />
    </div>
  );
}

export default App;
