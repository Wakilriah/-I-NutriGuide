import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { adminRoutes } from "../router/routes";
import { useAuthStore } from "../store/auth-store";

type AdminLayoutProps = {
  children?: ReactNode;
};

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const isActiveRoute = (routePath: string, isActive: boolean) => {
    if (routePath === "/foods/new") {
      return location.pathname === "/foods/new" || /^\/foods\/[^/]+\/edit$/.test(location.pathname);
    }
    return isActive;
  };

  return (
    <div className="admin-shell">
      <aside className="sidebar" aria-label="Admin navigation">
        <div className="brand-block">
          <span className="brand-mark">IG</span>
          <div>
            <p className="brand-name">I-NutriGuide</p>
            <p className="brand-subtitle">Nutrition admin</p>
          </div>
        </div>

        <nav className="nav-list">
          {adminRoutes.map((route) => (
            <NavLink
              className={({ isActive }) => (isActiveRoute(route.path, isActive) ? "nav-button nav-button-active" : "nav-button")}
              end={route.path === "/" || route.path === "/foods"}
              key={route.id}
              to={route.path}
            >
              <route.icon aria-hidden="true" size={18} />
              <span>{route.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div>
            <p className="user-name">{user?.name ?? "Admin"}</p>
            <p className="user-email">{user?.email ?? "admin@example.com"}</p>
          </div>
          <button aria-label="Log out" className="icon-button" onClick={handleLogout} type="button">
            <LogOut aria-hidden="true" size={18} />
          </button>
        </div>
      </aside>

      <main className="content-shell">{children ?? <Outlet />}</main>
    </div>
  );
}
