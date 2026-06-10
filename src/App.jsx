import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import NewPrescription from './pages/NewPrescription';
import History from './pages/History';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { ROUTES } from './data/constants';

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <Routes>
          <Route path={ROUTES.LOGIN} element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
              <Route path={ROUTES.PATIENTS} element={<Patients />} />
              <Route path={ROUTES.NEW_PRESCRIPTION} element={<NewPrescription />} />
              <Route path={ROUTES.HISTORY} element={<History />} />
              <Route path={ROUTES.SETTINGS} element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
