import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import RxIcon from '../components/RxIcon';
import { LOGO_PATH } from '../data/branding';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../data/constants';
import { getDemoCredentials } from '../services/authService';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isAuthReady } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [demoHint, setDemoHint] = useState('');
  const [error, setError] = useState('');

  const redirectPath = location.state?.from?.pathname ?? ROUTES.DASHBOARD;

  useEffect(() => {
    let cancelled = false;

    getDemoCredentials().then(({ email: demoEmail, passwordHint }) => {
      if (!cancelled) {
        setEmail(demoEmail);
        setDemoHint(`Demo account: ${demoEmail} / ${passwordHint}`);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (isAuthReady && isAuthenticated) {
    return <Navigate to={redirectPath} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const result = await login(email, password);

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
          <div className="login-brand-bar">
            <img src={LOGO_PATH} alt="" className="login-brand-logo" />
            <RxIcon size="lg" />
          </div>
          <h1>Sign in</h1>
          <p>Prescription management</p>
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

        {demoHint && <p className="login-hint">{demoHint}</p>}
      </Card>
    </section>
  );
}

export default Login;
