import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import AdminDashboardPage from "./pages/adminDash/adminDashboard";
import BhwDashboardPage from "./pages/BhwDashboard/BhwDashboardPage";
import MhoDashboardPage from "./pages/MhoDashboard/MhoDashboardPage";
import SuperAdminDashboardPage from "./pages/SuperAdminDashboard/SuperAdminDashboardPage";
import MunicipalDashboardPage from "./pages/MunicipalDashboard/MunicipalDashboardPage";
import ProtectedRoute from "./auth/protectedRoutes";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={["admin", "superadmin"]}>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bhw"
        element={
          <ProtectedRoute roles={["bhw"]}>
            <BhwDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mho"
        element={
          <ProtectedRoute roles={["mho"]}>
            <MhoDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin"
        element={
          <ProtectedRoute roles={["superadmin"]}>
            <SuperAdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/municipal"
        element={
          <ProtectedRoute roles={["municipal"]}>
            <MunicipalDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
