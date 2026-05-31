import React from 'react';
import { Text } from 'react-native';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type NavigatorScreenParams,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAppTheme } from '../theme/useAppTheme';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { DashboardScreen } from '../features/dashboard/DashboardScreen';
import { MetersStack } from '../features/meters/MetersStack';
import { AnalyticsScreen } from '../features/analytics/AnalyticsScreen';
import { BillCheckerStack } from '../features/bill-checker/BillCheckerStack';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import type { MetersStackParamList } from '../features/meters/navigation';
import type { BillCheckerStackParamList } from '../features/bill-checker/navigation';

const withBoundary =
  <P extends object>(Component: React.ComponentType<P>, label: string) =>
  (props: P) =>
    (
      <ErrorBoundary label={label}>
        <Component {...props} />
      </ErrorBoundary>
    );

const DashboardWithBoundary = withBoundary(DashboardScreen, 'Dashboard');
const MetersWithBoundary = withBoundary(MetersStack, 'Meters');
const AnalyticsWithBoundary = withBoundary(AnalyticsScreen, 'Analytics');
const BillCheckerWithBoundary = withBoundary(BillCheckerStack, 'Bill checker');
const SettingsWithBoundary = withBoundary(SettingsScreen, 'Settings');

export type RootTabParamList = {
  Dashboard: undefined;
  Meters: NavigatorScreenParams<MetersStackParamList> | undefined;
  Analytics: undefined;
  BillChecker: NavigatorScreenParams<BillCheckerStackParamList> | undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const tabIcon = (label: string) => ({
  color,
  size,
}: {
  color: string;
  size: number;
}) => (
  <Text style={{ color, fontSize: size, fontWeight: '700' }}>{label}</Text>
);

export function RootNavigator() {
  const { isDark, colors } = useAppTheme();

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { color: colors.text, fontWeight: '700' },
        }}>
        <Tab.Screen
          name="Dashboard"
          component={DashboardWithBoundary}
          options={{ tabBarIcon: tabIcon('●'), title: 'Dashboard' }}
        />
        <Tab.Screen
          name="Meters"
          component={MetersWithBoundary}
          options={{
            tabBarIcon: tabIcon('▤'),
            headerShown: false,
            title: 'Meters',
          }}
        />
        <Tab.Screen
          name="Analytics"
          component={AnalyticsWithBoundary}
          options={{ tabBarIcon: tabIcon('▦'), title: 'Analytics' }}
        />
        <Tab.Screen
          name="BillChecker"
          component={BillCheckerWithBoundary}
          options={{
            tabBarIcon: tabIcon('◉'),
            title: 'Bill',
            headerShown: false,
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsWithBoundary}
          options={{ tabBarIcon: tabIcon('⚙'), title: 'Settings' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
