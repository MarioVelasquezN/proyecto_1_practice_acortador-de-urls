import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function MainLayout() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <div>
      <header className="main-header">
        <Link to="/" className="main-header-logo">⚡ SNAP</Link>
        <nav className="main-nav">
          {isAuthenticated ? (
            <>
              <span className="nav-greeting">Hola, {user?.name}</span>
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              <button className="nav-btn-logout" onClick={logout}>Cerrar sesión</button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Iniciar sesión</Link>
              <Link to="/register" className="nav-link">Registrarse</Link>
            </>
          )}
        </nav>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
