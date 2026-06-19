import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function MainLayout() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <div>
      <header style={{ display: 'flex', gap: '1rem', padding: '1rem', borderBottom: '1px solid #ccc' }}>
        <Link to="/" style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>
          ⚡ SNAP
        </Link>
        <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginLeft: 'auto' }}>
          {isAuthenticated ? (
            <>
              <span>Hola, {user?.name}</span>
              <Link to="/dashboard">Dashboard</Link>
              <button onClick={logout}>Cerrar sesión</button>
            </>
          ) : (
            <>
              <Link to="/login">Iniciar sesión</Link>
              <Link to="/register">Registrarse</Link>
            </>
          )}
        </nav>
      </header>

      <main style={{ padding: '2rem' }}>
        <Outlet />
      </main>
    </div>
  );
}
