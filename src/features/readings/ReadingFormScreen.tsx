import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Card } from '../../components/Card';
import { OptionPicker } from '../../components/OptionPicker';
import { PrimaryButton } from '../../components/PrimaryButton';
import { TextField } from '../../components/TextField';
import { useAppTheme } from '../../theme/useAppTheme';
import { useMeterStore } from '../../store/meterStore';
import {
  selectReadingsForMeter,
  useReadingStore,
} from '../../store/readingStore';
import { useScanReading } from '../ocr/useScanReading';
import type { ReadingType } from '../../types/domain';
import {
  readingFormSchema,
  type ReadingFormValues,
} from './readingSchema';
import type { MetersStackParamList } from '../meters/navigation';

type Props = NativeStackScreenProps<MetersStackParamList, 'ReadingForm'>;

const TYPE_OPTIONS: { value: ReadingType; label: string }[] = [
  { value: 'BILL', label: 'BILL' },
  { value: 'CASUAL', label: 'CASUAL' },
];

export function ReadingFormScreen({ route, navigation }: Props) {
  const { colors } = useAppTheme();
  const { meterId, readingId, autoScan } = route.params;
  const isEdit = Boolean(readingId);

  const meter = useMeterStore(s => s.meters.find(m => m.id === meterId));
  const readingsSelector = useMemo(
    () => selectReadingsForMeter(meterId),
    [meterId],
  );
  const readings = useReadingStore(readingsSelector);
  const refreshForMeter = useReadingStore(s => s.refreshForMeter);
  const addReading = useReadingStore(s => s.add);
  const updateReading = useReadingStore(s => s.update);
  const removeReading = useReadingStore(s => s.remove);
  const { scanning, scanFromCamera, scanFromLibrary } = useScanReading();

  const editing = useMemo(
    () => (readingId ? readings.find(r => r.id === readingId) : undefined),
    [readingId, readings],
  );

  const [showPicker, setShowPicker] = useState(false);

  // OCR-side state lives outside the form because it isn't validated by Zod.
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [ocrDetectedValue, setOcrDetectedValue] = useState<number | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReadingFormValues>({
    resolver: zodResolver(readingFormSchema),
    defaultValues: {
      readingValue: editing?.readingValue.toString() ?? '',
      readingDate: editing?.readingDate ?? new Date().toISOString(),
      readingType: editing?.readingType ?? 'BILL',
      notes: editing?.notes ?? '',
    },
  });

  useEffect(() => {
    navigation.setOptions({
      title: isEdit ? 'Edit Reading' : 'Add Reading',
    });
  }, [isEdit, navigation]);

  useEffect(() => {
    if (isEdit && !editing) {
      refreshForMeter(meterId);
    }
  }, [editing, isEdit, meterId, refreshForMeter]);

  // Sync form + OCR state once the editing record resolves.
  useEffect(() => {
    if (editing) {
      reset({
        readingValue: editing.readingValue.toString(),
        readingDate: editing.readingDate,
        readingType: editing.readingType,
        notes: editing.notes ?? '',
      });
      setImagePath(editing.imagePath ?? null);
      setOcrDetectedValue(editing.ocrDetectedValue ?? null);
    }
  }, [editing, reset]);

  const readingDate = watch('readingDate');
  const currentValue = watch('readingValue');

  const handleScanResult = async (
    runner: () => ReturnType<typeof scanFromCamera>,
  ) => {
    try {
      const result = await runner();
      if (!result) {
        return;
      }
      setImagePath(result.imageUri);
      setOcrDetectedValue(result.suggestedValue);
      if (result.suggestedValue !== null) {
        setValue('readingValue', result.suggestedValue.toString(), {
          shouldValidate: true,
        });
      }
    } catch (e) {
      Alert.alert('OCR failed', (e as Error).message);
    }
  };

  // Auto-launch the camera once when arriving via the Dashboard "Scan
  // reading" quick action. We strip the param after firing so a navigation
  // re-render doesn't re-launch the picker.
  useEffect(() => {
    if (autoScan) {
      navigation.setParams({ autoScan: undefined });
      handleScanResult(scanFromCamera);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoScan]);

  const onSubmit = handleSubmit(async values => {
    try {
      const numericValue = Number(values.readingValue);
      if (!Number.isFinite(numericValue) || numericValue <= 0) {
        Alert.alert(
          'Invalid reading',
          'Reading must be a positive number with no commas. Use a dot for decimals.',
        );
        return;
      }
      if (isEdit && readingId) {
        await updateReading(readingId, meterId, {
          readingValue: numericValue,
          readingDate: values.readingDate,
          readingType: values.readingType,
          notes: values.notes ?? null,
          imagePath,
          ocrDetectedValue,
        });
      } else {
        await addReading({
          meterId,
          readingValue: numericValue,
          readingDate: values.readingDate,
          readingType: values.readingType,
          notes: values.notes ?? null,
          imagePath,
          ocrDetectedValue,
        });
      }
      navigation.goBack();
    } catch (e) {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.error('[ReadingForm] save failed', e);
      }
      Alert.alert(
        'Could not save reading',
        (e as Error).message || 'Unknown error',
      );
    }
  });

  const onDelete = () => {
    if (!readingId) {
      return;
    }
    Alert.alert('Delete reading?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removeReading(readingId, meterId);
          navigation.goBack();
        },
      },
    ]);
  };

  if (!meter) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <Text style={[styles.missing, { color: colors.textMuted }]}>
          Meter not found.
        </Text>
      </View>
    );
  }

  const parsedDate = readingDate ? parseISO(readingDate) : new Date();
  const dateValue = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

  // Show a notice when the user has manually edited an OCR-suggested value.
  const ocrAdjusted =
    ocrDetectedValue !== null &&
    currentValue.trim().length > 0 &&
    Number(currentValue) !== ocrDetectedValue;

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <Card
          title={meter.meterName}
          subtitle={`Consumer No: ${meter.consumerNumber}`}>
          <Controller
            control={control}
            name="readingValue"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField
                label="Reading value (units)"
                placeholder="e.g. 12450"
                keyboardType="decimal-pad"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                errorText={errors.readingValue?.message}
              />
            )}
          />
          {ocrAdjusted ? (
            <Text style={[styles.ocrCorrection, { color: colors.warning }]}>
              You've adjusted the OCR suggestion ({ocrDetectedValue}). Both
              values are saved for audit.
            </Text>
          ) : null}

          <View style={styles.spacer} />

          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
            Reading date
          </Text>
          <Pressable
            onPress={() => setShowPicker(true)}
            style={[
              styles.dateButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}>
            <Text style={[styles.dateText, { color: colors.text }]}>
              {format(dateValue, 'd MMM yyyy')}
            </Text>
            <Text style={[styles.dateChange, { color: colors.primary }]}>
              Change
            </Text>
          </Pressable>
          {errors.readingDate ? (
            <Text style={[styles.error, { color: colors.danger }]}>
              {errors.readingDate.message}
            </Text>
          ) : null}

          {showPicker ? (
            <DateTimePicker
              value={dateValue}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={(event, selectedDate) => {
                if (Platform.OS === 'android') {
                  setShowPicker(false);
                }
                if (event.type === 'set' && selectedDate) {
                  setValue('readingDate', selectedDate.toISOString(), {
                    shouldValidate: true,
                  });
                }
              }}
            />
          ) : null}

          <View style={styles.spacer} />

          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
            Reading type
          </Text>
          <Controller
            control={control}
            name="readingType"
            render={({ field: { value, onChange } }) => (
              <OptionPicker<ReadingType>
                value={value}
                onChange={onChange}
                options={TYPE_OPTIONS}
                horizontal={false}
                errorText={errors.readingType?.message}
              />
            )}
          />
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            BILL readings are used for monthly usage math. CASUAL readings
            don't affect billing calculations.
          </Text>
        </Card>

        <Card
          title="Scan meter (OCR)"
          subtitle="We'll suggest the largest plausible number from your photo."
          style={styles.section}>
          {imagePath ? (
            <View style={styles.imageRow}>
              <Image source={{ uri: imagePath }} style={styles.thumbnail} />
              <View style={styles.flex}>
                <Text style={[styles.imageHint, { color: colors.textMuted }]}>
                  {ocrDetectedValue !== null
                    ? `OCR suggested: ${ocrDetectedValue.toLocaleString()}`
                    : 'No reading detected. You can still keep the photo.'}
                </Text>
                <View style={styles.spacerSmall} />
                <PrimaryButton
                  label="Remove image"
                  variant="ghost"
                  onPress={() => {
                    setImagePath(null);
                    setOcrDetectedValue(null);
                  }}
                />
              </View>
            </View>
          ) : null}

          <View style={imagePath ? styles.spacer : undefined} />

          <View style={styles.row}>
            <PrimaryButton
              label={scanning ? 'Scanning…' : '📷 Scan with camera'}
              onPress={() => handleScanResult(scanFromCamera)}
              loading={scanning}
              style={styles.flex}
            />
          </View>
          <View style={styles.spacerSmall} />
          <PrimaryButton
            label="🖼  Pick from gallery"
            variant="outline"
            onPress={() => handleScanResult(scanFromLibrary)}
            disabled={scanning}
          />
        </Card>

        <Card title="Notes (optional)" style={styles.section}>
          <Controller
            control={control}
            name="notes"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField
                placeholder="Any context you want to remember…"
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                multiline
                numberOfLines={4}
                style={styles.notes}
                errorText={errors.notes?.message}
              />
            )}
          />
        </Card>

        <View style={styles.actions}>
          <PrimaryButton
            label={isEdit ? 'Save changes' : 'Add reading'}
            loading={isSubmitting}
            onPress={onSubmit}
          />
          {isEdit ? (
            <View style={styles.spacer}>
              <PrimaryButton
                label="Delete reading"
                variant="danger"
                onPress={onDelete}
              />
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
  spacerSmall: { height: 8 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  dateText: { fontSize: 15, fontWeight: '600' },
  dateChange: { fontSize: 13, fontWeight: '700' },
  error: { fontSize: 12, marginTop: 4 },
  hint: { fontSize: 12, marginTop: 8, lineHeight: 17 },
  notes: { minHeight: 96, textAlignVertical: 'top' },
  actions: { marginTop: 20 },
  missing: { textAlign: 'center', marginTop: 64 },
  row: { flexDirection: 'row' },
  imageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  imageHint: { fontSize: 13, lineHeight: 18 },
  ocrCorrection: { fontSize: 12, marginTop: 6, lineHeight: 17 },
});
