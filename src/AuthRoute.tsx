import { useAuth } from "./context/AuthProvider";
import { Navigate, Outlet, useLocation } from "react-router-dom";

const AuthRoute = () => {
  const { session } = useAuth();
  const location = useLocation();

  // Loading State
  if (session === undefined) return <></>;
  // Logged In & Doctor Only
  if (session && session.user?.user_metadata?.role === 'doctor') return <Navigate to="/set_password" replace state={{ from: location }} />
  // Logged In State
  if (session) return <Outlet/>
  // Logged Out State
  return <Navigate to="/login" replace state={{ from: location }} />
};

export default AuthRoute;