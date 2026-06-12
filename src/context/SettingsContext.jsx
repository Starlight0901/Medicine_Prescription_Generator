import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getSettings, updateSettings as persistSettings } from '../services/apiService';
import { normalizeSettings } from '../services/settingsService';

const EMPTY_SETTINGS = normalizeSettings();

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(EMPTY_SETTINGS);
  const [isSettingsReady, setIsSettingsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getSettings().then((loadedSettings) => {
      if (!cancelled) {
        setSettings(loadedSettings);
        setIsSettingsReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      settings,
      isSettingsReady,
      updateSettings: async (settingsInput) => {
        const result = await persistSettings(settingsInput);

        if (result.success) {
          setSettings(result.data);
        }

        return result;
      },
      refreshSettings: async () => {
        const latestSettings = await getSettings();
        setSettings(latestSettings);
        return latestSettings;
      },
    }),
    [settings, isSettingsReady]
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
