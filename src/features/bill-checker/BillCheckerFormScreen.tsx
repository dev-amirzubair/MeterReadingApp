import React, { useEffect, useMemo } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMMKVString } from 'react-native-mmkv';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '../../components/Card';
import { OptionPicker } from '../../components/OptionPicker';
import { PrimaryButton } from '../../components/PrimaryButton';
import { TextField } from '../../components/TextField';
import { useAppTheme } from '../../theme/useAppTheme';
import { storage } from '../../storage/mmkv';
import { STORAGE_KEYS } from '../../constants/app';
import { useMeterStore } from '../../store/meterStore';
import { DISCOS, type Disco, type Meter } from '../../types/domain';
import {
  billCheckerSchema,
  type BillCheckerFormValues,
} from './billCheckerSchema';
import { buildBillUrl, BillUrlError, configuredDiscos } from './buildBillUrl';
import type { BillCheckerStackParamList } from './navigation';

type Props = NativeStackScreenProps<BillCheckerStackParamList, 'BillCheckerForm'>;

const discoLabelOf = (code: Disco): string =>
  DISCOS.find(d => d.value === code)?.label ?? code;

export function BillCheckerFormScreen({ navigation }: Props) {
  const { colors } = useAppTheme();

  const meters = useMeterStore(s => s.meters);
  const refreshMeters = useMeterStore(s => s.refresh);

  // Refresh saved meters whenever the user returns to this screen so newly
  // added meters show up immediately under "Your saved meters".
  useFocusEffect(
    React.useCallback(() => {
      refreshMeters();
    }, [refreshMeters]),
  );

  const [lastDisco, setLastDisco] = useMMKVString(
    STORAGE_KEYS.LAST_DISCO,
    storage,
  );

  const supported = useMemo(() => configuredDiscos(), []);
  const supportedSet = useMemo(() => new Set(supported), [supported]);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BillCheckerFormValues>({
    resolver: zodResolver(billCheckerSchema),
    defaultValues: {
      disco: (lastDisco as Disco) ?? supported[0] ?? 'LESCO',
      consumerNumber: '',
    },
  });

  useEffect(() => {
    navigation.setOptions({ title: 'Check Bill' });
  }, [navigation]);

  const openBillFor = (disco: Disco, consumerNumber: string, meterName?: string) => {
    try {
      const url = buildBillUrl(disco, consumerNumber);
      setLastDisco(disco);
      const label = discoLabelOf(disco);
      navigation.navigate('BillWebView', {
        url,
        title: label,
        meterName,
        consumerNumber,
        discoLabel: label,
      });
    } catch (e) {
      if (e instanceof BillUrlError) {
        Alert.alert('Setup needed', e.message);
      } else {
        Alert.alert('Could not open bill', (e as Error).message);
      }
    }
  };

  const onSubmit = handleSubmit(values => {
    openBillFor(values.disco as Disco, values.consumerNumber);
  });

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        {meters.length > 0 ? (
          <Card
            title="Your saved meters"
            subtitle="Tap a meter to open its bill page. Your consumer number will be ready to copy in the WebView header.">
            <View style={styles.metersList}>
              {meters.map(m => (
                <SavedMeterCard
                  key={m.id}
                  meter={m}
                  onOpen={() =>
                    openBillFor(m.disco, m.consumerNumber, m.meterName)
                  }
                />
              ))}
            </View>
          </Card>
        ) : null}

        <Card
          title={
            meters.length > 0
              ? 'Or check a different consumer number'
              : 'Check your bill'
          }
          subtitle={
            meters.length > 0
              ? undefined
              : 'Opens the official DISCO page in an in-app browser.'
          }
          style={meters.length > 0 ? styles.section : undefined}>
          <Controller
            control={control}
            name="disco"
            render={({ field: { value, onChange } }) => (
              <OptionPicker<Disco>
                label="Distribution company"
                value={value as Disco}
                onChange={onChange}
                horizontal={false}
                options={DISCOS.map(d => ({
                  value: d.value,
                  label:
                    supportedSet.has(d.value) || d.value === 'OTHER'
                      ? d.label
                      : `${d.label} (no URL)`,
                }))}
                errorText={errors.disco?.message}
              />
            )}
          />

          <View style={styles.spacer} />

          <Controller
            control={control}
            name="consumerNumber"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField
                label="Consumer number"
                placeholder="e.g. 12 34567 8901234"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                errorText={errors.consumerNumber?.message}
                keyboardType="numbers-and-punctuation"
              />
            )}
          />
        </Card>

        <Card title="How it works" style={styles.section}>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            URLs are read from your `.env` file and are never hard-coded in the
            app source. You can swap them at any time by editing `.env` (and
            rebuilding for your changes to take effect).
          </Text>
          <Text style={[styles.body, { color: colors.textMuted, marginTop: 6 }]}>
            Currently configured DISCOs:{' '}
            <Text style={{ color: colors.text, fontWeight: '700' }}>
              {supported.length > 0 ? supported.join(', ') : 'none'}
            </Text>
            .
          </Text>
        </Card>

        <View style={styles.actions}>
          <PrimaryButton
            label="Open bill"
            loading={isSubmitting}
            onPress={onSubmit}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

interface SavedMeterCardProps {
  meter: Meter;
  onOpen: () => void;
}

function SavedMeterCard({ meter, onOpen }: SavedMeterCardProps) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [
        styles.savedRow,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
      <View style={styles.flex}>
        <Text style={[styles.savedName, { color: colors.text }]}>
          {meter.meterName}
        </Text>
        <Text style={[styles.savedConsumer, { color: colors.textMuted }]}>
          {meter.consumerNumber}
        </Text>
      </View>
      <View style={[styles.savedBadge, { backgroundColor: colors.primarySoft }]}>
        <Text style={[styles.savedBadgeText, { color: colors.primary }]}>
          {discoLabelOf(meter.disco)}
        </Text>
      </View>
      <Text style={[styles.savedChevron, { color: colors.textMuted }]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  section: { marginTop: 12 },
  spacer: { height: 12 },
  actions: { marginTop: 20 },
  body: { fontSize: 13, lineHeight: 19 },

  metersList: { marginTop: 4 },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  savedName: { fontSize: 15, fontWeight: '700' },
  savedConsumer: { fontSize: 12, marginTop: 2 },
  savedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginLeft: 8,
  },
  savedBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  savedChevron: {
    fontSize: 22,
    fontWeight: '300',
    marginLeft: 8,
  },
});
