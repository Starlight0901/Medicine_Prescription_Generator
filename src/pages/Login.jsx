import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import { NAV_ICONS } from '../components/NavIcons';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../data/constants';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('doctor@gmail.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const redirectPath = location.state?.from?.pathname ?? ROUTES.DASHBOARD;

  if (isAuthenticated) {
    return <Navigate to={redirectPath} replace />;
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const result = login(email, password);

    if (!result.success) {
      setError(result.error);
      return;
    }

    navigate(redirectPath, { replace: true });
  }

  return (
    <section className="login-page">
      <Card className="login-card glass-card--strong">
        <div className="login-brand">
          <div className="login-brand-icon" aria-hidden="true">
            {NAV_ICONS.brand}
          </div>
          <h1>Sign in</h1>
          <p>Doctor Prescription Management System</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p className="status-message status-message--error" role="alert">{error}</p>
          )}

          <button type="submit" className="btn btn-primary">
            Login
          </button>
        </form>

        <p className="login-hint">
          Demo account: doctor@gmail.com / password123
        </p>
      </Card>
    </section>
  );
}

export default Login;
