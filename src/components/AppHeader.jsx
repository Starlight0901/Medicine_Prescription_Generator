import { LOGO_PATH } from '../data/branding';
import RxIcon from './RxIcon';

function AppHeader() {
  return (
    <header className="app-header">
      <img src={LOGO_PATH} alt="" className="app-header-logo" />
      <RxIcon size="md" className="app-header-rx" />
    </header>
  );
}

export default AppHeader;
