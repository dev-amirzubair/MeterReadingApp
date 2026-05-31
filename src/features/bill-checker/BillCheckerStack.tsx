import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppTheme } from '../../theme/useAppTheme';
import { BillCheckerFormScreen } from './BillCheckerFormScreen';
import { BillWebViewScreen } from './BillWebViewScreen';
import type { BillCheckerStackParamList } from './navigation';

const Stack = createNativeStackNavigator<BillCheckerStackParamList>();

export function BillCheckerStack() {
  const { colors } = useAppTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        headerTintColor: colors.primary,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen
        name="BillCheckerForm"
        component={BillCheckerFormScreen}
      />
      <Stack.Screen name="BillWebView" component={BillWebViewScreen} />
    </Stack.Navigator>
  );
}
