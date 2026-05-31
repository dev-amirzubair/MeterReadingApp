import React, { useEffect } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Card } from '../../components/Card';
import { OptionPicker } from '../../components/OptionPicker';
import { PrimaryButton } from '../../components/PrimaryButton';
import { TextField } from '../../components/TextField';
import { useAppTheme } from '../../theme/useAppTheme';
import { DISCOS, type Disco } from '../../types/domain';
import { useMeterStore } from '../../store/meterStore';
import { meterFormSchema, type MeterFormValues } from './meterSchema';
import type { MetersStackParamList } from './navigation';

type Props = NativeStackScreenProps<MetersStackParamList, 'MeterForm'>;

export function MeterFormScreen({ route, navigation }: Props) {
  const { colors } = useAppTheme();
  const editingId = route.params?.meterId;
  const isEdit = Boolean(editingId);

  const meter = useMeterStore(state =>
    editingId ? state.meters.find(m => m.id === editingId) : undefined,
  );
  const addMeter = useMeterStore(s => s.add);
  const updateMeter = useMeterStore(s => s.update);
  const removeMeter = useMeterStore(s => s.remove);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MeterFormValues>({
    resolver: zodResolver(meterFormSchema),
    defaultValues: {
      meterName: meter?.meterName ?? '',
      consumerNumber: meter?.consumerNumber ?? '',
      disco: meter?.disco ?? 'LESCO',
    },
  });

  useEffect(() => {
    navigation.setOptions({
      title: isEdit ? 'Edit Meter' : 'Add Meter',
    });
  }, [isEdit, navigation]);

  useEffect(() => {
    if (meter) {
      reset({
        meterName: meter.meterName,
        consumerNumber: meter.consumerNumber,
        disco: meter.disco,
      });
    }
  }, [meter, reset]);

  const onSubmit = handleSubmit(async values => {
    try {
      if (editingId) {
        await updateMeter(editingId, {
          meterName: values.meterName,
          consumerNumber: values.consumerNumber,
          disco: values.disco as Disco,
        });
      } else {
        await addMeter({
          meterName: values.meterName,
          consumerNumber: values.consumerNumber,
          disco: values.disco as Disco,
        });
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Could not save meter', (e as Error).message);
    }
  });

  const onDelete = () => {
    if (!editingId) {
      return;
    }
    Alert.alert(
      'Delete meter?',
      'This will also delete every reading recorded against this meter.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await removeMeter(editingId);
            navigation.popToTop();
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card title="Meter details" subtitle="Stored locally on this device.">
          <Controller
            control={control}
            name="meterName"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField
                label="Meter name"
                placeholder="Home, Shop, Tube well…"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                errorText={errors.meterName?.message}
                autoCapitalize="words"
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

        <Card title="DISCO" subtitle="Distribution company that bills this meter." style={styles.section}>
          <Controller
            control={control}
            name="disco"
            render={({ field: { value, onChange } }) => (
              <OptionPicker<Disco>
                value={value as Disco}
                onChange={onChange}
                errorText={errors.disco?.message}
                options={DISCOS.map(d => ({
                  value: d.value,
                  label: d.label,
                }))}
              />
            )}
          />
          <View style={styles.spacer} />
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Tip: pick the company shown on your printed bill.
          </Text>
        </Card>

        <View style={styles.actions}>
          <PrimaryButton
            label={isEdit ? 'Save changes' : 'Add meter'}
            loading={isSubmitting}
            onPress={onSubmit}
          />
          {isEdit ? (
            <View style={styles.spacer}>
              <PrimaryButton label="Delete meter" variant="danger" onPress={onDelete} />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  section: { marginTop: 12 },
  spacer: { height: 12 },
  hint: { fontSize: 12 },
  actions: { marginTop: 20 },
});
