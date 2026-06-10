import { Outlet } from 'react-router-dom';
import AppHeader from './AppHeader';
import Navbar from './Navbar';

function Layout() {
  return (
    <div className="app-layout">
      <Navbar />
      <div className="app-content">
        <AppHeader />
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
