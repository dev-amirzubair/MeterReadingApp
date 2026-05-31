/**
 * Meter Tracker PK
 * RN CLI app: SQLite + MMKV + Zustand + WebView + Navigation.
 *
 * @format
 */

import 'react-native-gesture-handler';
import 'react-native-reanimated';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  type AppStateStatus,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BootSplash from 'react-native-bootsplash';
import { RootNavigator } from './src/navigation/RootNavigator';
import { getDb } from './src/database/connection';
import { useMeterStore } from './src/store/meterStore';
import { useSettingsStore } from './src/store/settingsStore';
import { useAppTheme } from './src/theme/useAppTheme';
import { refreshScheduleIfNeeded } from './src/features/notifications/notificationsService';
import { requestStartupPermissions } from './src/features/permissions/permissionService';

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemedRoot />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function ThemedRoot() {
  const { isDark, colors } = useAppTheme();
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const refreshMeters = useMeterStore(s => s.refresh);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    (async () => {
      try {
        await getDb(); // open + run migrations
        await refreshMeters();
        setReady(true);
      } catch (e) {
        setBootError((e as Error).message);
      } finally {
        // Hide the native splash screen once we have a useful UI to show
        // (success, loading, or error). Fade is purely cosmetic.
        BootSplash.hide({ fade: true }).catch(() => {});
      }
      // Ask for camera / notifications / media permissions exactly once on
      // first launch. Runs after the splash hides so the OS dialog doesn't
      // overlap the splash screen. Failures here are non-fatal.
      requestStartupPermissions().catch(() => {});
    })();
  }, [refreshMeters]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    const tick = () => {
      const { notificationsEnabled, reminderDay, reminderHour } =
        useSettingsStore.getState();
      refreshScheduleIfNeeded(
        { day: reminderDay, hour: reminderHour },
        notificationsEnabled,
      ).catch(() => {});
    };
    tick();
    const sub = AppState.addEventListener('change', next => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        next === 'active'
      ) {
        tick();
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [ready]);

  if (bootError) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorTitle, { color: colors.danger }]}>
          Failed to start
        </Text>
        <Text style={[styles.errorBody, { color: colors.textMuted }]}>
          {bootError}
        </Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <RootNavigator />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorTitle: { fontSize: 18, fontWeight: '700' },
  errorBody: { fontSize: 13, marginTop: 8, textAlign: 'center' },
});

export default App;
