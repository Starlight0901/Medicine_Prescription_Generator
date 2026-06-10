import { createContext, useContext, useMemo, useState } from 'react';
import { getSettings, updateSettings as persistSettings } from '../services/apiService';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => getSettings());

  const value = useMemo(
    () => ({
      settings,
      updateSettings: (settingsInput) => {
        const result = persistSettings(settingsInput);

        if (result.success) {
          setSettings(result.data);
        }

        return result;
      },
      refreshSettings: () => {
        const latestSettings = getSettings();
        setSettings(latestSettings);
        return latestSettings;
      },
    }),
    [settings]
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider.');
  }

  return context;
}
