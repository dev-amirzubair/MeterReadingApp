import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppTheme } from '../../theme/useAppTheme';
import { MeterListScreen } from './MeterListScreen';
import { MeterFormScreen } from './MeterFormScreen';
import { MeterDetailScreen } from './MeterDetailScreen';
import { ReadingFormScreen } from '../readings/ReadingFormScreen';
import { ReadingsListScreen } from '../readings/ReadingsListScreen';
import type { MetersStackParamList } from './navigation';

const Stack = createNativeStackNavigator<MetersStackParamList>();

export function MetersStack() {
  const { colors } = useAppTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        headerTintColor: colors.primary,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="MeterList" component={MeterListScreen} />
      <Stack.Screen name="MeterForm" component={MeterFormScreen} />
      <Stack.Screen name="MeterDetail" component={MeterDetailScreen} />
      <Stack.Screen name="ReadingForm" component={ReadingFormScreen} />
      <Stack.Screen name="ReadingsList" component={ReadingsListScreen} />
    </Stack.Navigator>
  );
}
