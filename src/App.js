import React from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import Login from "./components/Login";
import AdminForm from "./components/AdminForm";
import Scanner from "./components/Scanner";
import PublicVerifyPage from "./pages/PublicVerifyPage";
import { logout } from "./api";
import { useAuth } from "./authContext";

const Nav = () => {
  const { user } = useAuth();
  const loc = useLocation();
  if (loc.pathname === "/login") return null;

  const bar = {
    display: "flex",
    gap: 12,
    alignItems: "center",
    padding: "10px 16px",
    background: "#fff",
    borderBottom: "1px solid #e5e7eb",
  };
  const a = { textDecoration: "none", color: "#0f172a", fontWeight: 600 };
  const btn = {
    marginLeft: "auto",
    height: 36,
    padding: "0 12px",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
    cursor: "pointer",
  };

  return (
    <div style={bar}>
      <Link to="/admin" style={a}>
        Convocation QR Invites
      </Link>
      <Link to="/scan" style={a}>
        Scanner
      </Link>
      {user && (
        <button
          style={btn}
          onClick={async () => {
            await logout();
            window.location.href = "/login";
          }}
        >
          Logout
        </button>
      )}
    </div>
  );
};

const Protected = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 20 }}>Loading…</div>;
  return user ? children : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/verify/:token" element={<PublicVerifyPage />} />
        <Route
          path="/admin"
          element={
            <Protected>
              <AdminForm />
            </Protected>
          }
        />
        <Route
          path="/scan"
          element={
            <Protected>
              <Scanner />
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </>
  );
}
