import { Navigate } from "react-router-dom";
import { useAuth } from "./authContext";

export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return children;
}
