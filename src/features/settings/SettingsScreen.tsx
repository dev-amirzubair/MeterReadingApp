import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { format } from 'date-fns';
import { Card } from '../../components/Card';
import { OptionPicker } from '../../components/OptionPicker';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAppTheme } from '../../theme/useAppTheme';
import {
  useSettingsStore,
  type ThemeMode,
} from '../../store/settingsStore';
import { useMeterStore } from '../../store/meterStore';
import { useReadingStore } from '../../store/readingStore';
import { APP_NAME, APP_VERSION } from '../../constants/app';
import {
  exportJsonBackup,
  exportReadingsCsv,
  importJsonBackup,
} from '../backup/backupService';
import {
  cancelMonthlyReminders,
  getScheduleStatus,
  requestNotificationPermission,
  scheduleMonthlyReminders,
} from '../notifications/notificationsService';
import {
  getAllPermissionStatuses,
  requestPermission,
  resetStartupAskedFlag,
  type PermissionKind,
  type PermissionStatusMap,
} from '../permissions/permissionService';

const MODE_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

type DayKey = '1' | '5' | '10' | '15' | '20' | '25' | '28';
const DAY_OPTIONS: { value: DayKey; label: string }[] = [
  { value: '1', label: '1st' },
  { value: '5', label: '5th' },
  { value: '10', label: '10th' },
  { value: '15', label: '15th' },
  { value: '20', label: '20th' },
  { value: '25', label: '25th' },
  { value: '28', label: '28th' },
];

type HourKey = '7' | '9' | '12' | '17' | '19' | '21';
const HOUR_OPTIONS: { value: HourKey; label: string }[] = [
  { value: '7', label: '7 AM' },
  { value: '9', label: '9 AM' },
  { value: '12', label: '12 PM' },
  { value: '17', label: '5 PM' },
  { value: '19', label: '7 PM' },
  { value: '21', label: '9 PM' },
];

function nearestDayKey(day: number): DayKey {
  const keys = DAY_OPTIONS.map(o => Number(o.value));
  const closest = keys.reduce((a, b) =>
    Math.abs(b - day) < Math.abs(a - day) ? b : a,
  );
  return String(closest) as DayKey;
}

function nearestHourKey(hour: number): HourKey {
  const keys = HOUR_OPTIONS.map(o => Number(o.value));
  const closest = keys.reduce((a, b) =>
    Math.abs(b - hour) < Math.abs(a - hour) ? b : a,
  );
  return String(closest) as HourKey;
}

export function SettingsScreen() {
  const { colors, isDark } = useAppTheme();
  const themeMode = useSettingsStore(s => s.themeMode);
  const setThemeMode = useSettingsStore(s => s.setThemeMode);
  const notificationsEnabled = useSettingsStore(s => s.notificationsEnabled);
  const setNotificationsEnabled = useSettingsStore(
    s => s.setNotificationsEnabled,
  );
  const reminderDay = useSettingsStore(s => s.reminderDay);
  const reminderHour = useSettingsStore(s => s.reminderHour);
  const setReminderDay = useSettingsStore(s => s.setReminderDay);
  const setReminderHour = useSettingsStore(s => s.setReminderHour);
  const refreshMeters = useMeterStore(s => s.refresh);
  const refreshReadings = useReadingStore(s => s.refreshForMeter);
  const meters = useMeterStore(s => s.meters);

  const [busy, setBusy] = useState<
    null | 'export-json' | 'import-json' | 'export-csv' | 'reminder' | 'permission'
  >(null);
  const [nextReminderAt, setNextReminderAt] = useState<number | null>(null);
  const [perms, setPerms] = useState<PermissionStatusMap | null>(null);

  const refreshPerms = useCallback(async () => {
    try {
      setPerms(await getAllPermissionStatuses());
    } catch {
      setPerms(null);
    }
  }, []);

  useEffect(() => {
    refreshPerms();
  }, [refreshPerms]);

  const handleRequestPermission = useCallback(
    async (kind: PermissionKind) => {
      setBusy('permission');
      try {
        const result = await requestPermission(kind);
        await refreshPerms();
        if (result === 'never_ask_again') {
          Alert.alert(
            'Open app settings',
            'You\'ve previously denied this permission with "Don\'t ask again". Enable it from Settings → Apps → Meter Tracker → Permissions.',
          );
        }
      } finally {
        setBusy(null);
      }
    },
    [refreshPerms],
  );

  const handleResetPermissionPrompts = useCallback(() => {
    resetStartupAskedFlag();
    Alert.alert(
      'Permission prompts reset',
      'Restart the app to be asked for camera, notifications and gallery access again.',
    );
  }, []);

  const refreshNextReminder = useCallback(async () => {
    try {
      const status = await getScheduleStatus();
      setNextReminderAt(status.nextAt);
    } catch {
      setNextReminderAt(null);
    }
  }, []);

  useEffect(() => {
    refreshNextReminder();
  }, [refreshNextReminder, notificationsEnabled, reminderDay, reminderHour]);

  const applyReminderSchedule = useCallback(
    async (day: number, hour: number) => {
      setBusy('reminder');
      try {
        const ts = await scheduleMonthlyReminders({ day, hour });
        if (ts == null) {
          Alert.alert(
            'Notifications blocked',
            'Permission for notifications is not granted. Enable it in your phone\'s settings to receive bill reminders.',
          );
        }
        await refreshNextReminder();
      } catch (e) {
        Alert.alert('Could not schedule reminder', (e as Error).message);
      } finally {
        setBusy(null);
      }
    },
    [refreshNextReminder],
  );

  const handleToggleNotifications = useCallback(
    async (next: boolean) => {
      if (!next) {
        setNotificationsEnabled(false);
        setBusy('reminder');
        try {
          await cancelMonthlyReminders();
          await refreshNextReminder();
        } finally {
          setBusy(null);
        }
        return;
      }

      setBusy('reminder');
      try {
        const perm = await requestNotificationPermission();
        if (!perm.granted) {
          Alert.alert(
            'Permission denied',
            'You can enable notifications later from your phone\'s app settings.',
          );
          setNotificationsEnabled(false);
          return;
        }
        setNotificationsEnabled(true);
        const ts = await scheduleMonthlyReminders({
          day: reminderDay,
          hour: reminderHour,
        });
        if (ts == null) {
          setNotificationsEnabled(false);
        }
        await refreshNextReminder();
      } catch (e) {
        Alert.alert('Could not enable reminders', (e as Error).message);
        setNotificationsEnabled(false);
      } finally {
        setBusy(null);
      }
    },
    [reminderDay, reminderHour, refreshNextReminder, setNotificationsEnabled],
  );

  const handleDayChange = useCallback(
    async (key: DayKey) => {
      const day = Number(key);
      setReminderDay(day);
      if (notificationsEnabled) {
        await applyReminderSchedule(day, reminderHour);
      }
    },
    [applyReminderSchedule, notificationsEnabled, reminderHour, setReminderDay],
  );

  const handleHourChange = useCallback(
    async (key: HourKey) => {
      const hour = Number(key);
      setReminderHour(hour);
      if (notificationsEnabled) {
        await applyReminderSchedule(reminderDay, hour);
      }
    },
    [applyReminderSchedule, notificationsEnabled, reminderDay, setReminderHour],
  );

  const handleExportJson = async () => {
    setBusy('export-json');
    try {
      await exportJsonBackup();
    } catch (e) {
      Alert.alert('Export failed', (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleImportJson = () => {
    Alert.alert(
      'Restore from backup?',
      'This will replace ALL meters and readings on this device with the contents of the chosen file. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose file',
          style: 'destructive',
          onPress: async () => {
            setBusy('import-json');
            try {
              const result = await importJsonBackup();
              if (!result) {
                return;
              }
              await refreshMeters();
              // Refresh any open meter's readings cache.
              await Promise.all(
                meters.map(m => refreshReadings(m.id).catch(() => {})),
              );
              Alert.alert(
                'Restore complete',
                `Imported ${result.meters} meter${result.meters === 1 ? '' : 's'} and ${result.readings} reading${result.readings === 1 ? '' : 's'}.`,
              );
            } catch (e) {
              Alert.alert('Restore failed', (e as Error).message);
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  };

  const handleExportCsv = async () => {
    setBusy('export-csv');
    try {
      await exportReadingsCsv();
    } catch (e) {
      Alert.alert('Export failed', (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}>
      <Card title="Appearance" subtitle={`Currently ${isDark ? 'dark' : 'light'} theme`}>
        <OptionPicker<ThemeMode>
          value={themeMode}
          onChange={setThemeMode}
          options={MODE_OPTIONS}
        />
      </Card>

      <Card
        title="Notifications"
        subtitle="Local-only reminders. We never send your data anywhere."
        style={styles.section}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>
              Monthly bill reminder
            </Text>
            <Text style={[styles.rowHint, { color: colors.textMuted }]}>
              {nextReminderAt
                ? `Next: ${format(nextReminderAt, "EEE, dd MMM 'at' h:mm a")}`
                : notificationsEnabled
                  ? 'Scheduling…'
                  : 'Off — flip the switch to schedule a year of reminders.'}
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleToggleNotifications}
            disabled={busy === 'reminder'}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>

        {notificationsEnabled ? (
          <>
            <View style={styles.dividerSm} />
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
              Day of the month
            </Text>
            <OptionPicker<DayKey>
              value={nearestDayKey(reminderDay)}
              onChange={handleDayChange}
              options={DAY_OPTIONS}
            />
            <View style={styles.dividerSm} />
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
              Time of day
            </Text>
            <OptionPicker<HourKey>
              value={nearestHourKey(reminderHour)}
              onChange={handleHourChange}
              options={HOUR_OPTIONS}
            />
            <Text style={[styles.warning, { color: colors.textMuted }]}>
              Day is capped at 28 to stay safe in February. We schedule the
              next 12 months on each change; leaving the app open lets us top
              the schedule back up.
            </Text>
          </>
        ) : null}
      </Card>

      <Card
        title="Backup & restore"
        subtitle="Stored locally; export anytime to keep your data safe."
        style={styles.section}>
        <PrimaryButton
          label="Export all data (.json)"
          onPress={handleExportJson}
          loading={busy === 'export-json'}
          disabled={busy !== null}
        />
        <View style={styles.spacer} />
        <PrimaryButton
          label="Import from backup"
          variant="outline"
          onPress={handleImportJson}
          loading={busy === 'import-json'}
          disabled={busy !== null}
        />
        <Text style={[styles.warning, { color: colors.textMuted }]}>
          Importing a backup overwrites all current meters and readings on
          this device.
        </Text>
      </Card>

      <Card title="Reports" subtitle="Share or save your data" style={styles.section}>
        <PrimaryButton
          label="Export readings as CSV"
          variant="outline"
          onPress={handleExportCsv}
          loading={busy === 'export-csv'}
          disabled={busy !== null}
        />
        <View style={styles.spacer} />
        <PrimaryButton
          label="Export PDF report"
          variant="ghost"
          disabled
          onPress={() => {}}
        />
        <Text style={[styles.warning, { color: colors.textMuted }]}>
          PDF report is deferred — once we re-introduce a PDF library that
          supports the new architecture, this button will produce a styled
          monthly usage report.
        </Text>
      </Card>

      <Card
        title="Permissions"
        subtitle="Required for camera scanning, notifications and gallery access."
        style={styles.section}>
        <PermissionRow
          label="Camera"
          hint="For scanning meter readings (OCR)."
          status={perms?.camera}
          onRequest={() => handleRequestPermission('camera')}
          disabled={busy !== null}
          color={colors.text}
          mutedColor={colors.textMuted}
          successColor={colors.success}
          dangerColor={colors.danger}
          warningColor={colors.warning}
        />
        <View style={styles.dividerSm} />
        <PermissionRow
          label="Notifications"
          hint="For monthly bill reminders."
          status={perms?.notifications}
          onRequest={() => handleRequestPermission('notifications')}
          disabled={busy !== null}
          color={colors.text}
          mutedColor={colors.textMuted}
          successColor={colors.success}
          dangerColor={colors.danger}
          warningColor={colors.warning}
        />
        <View style={styles.dividerSm} />
        <PermissionRow
          label="Photos / gallery"
          hint="For picking existing meter pictures."
          status={perms?.mediaImages}
          onRequest={() => handleRequestPermission('mediaImages')}
          disabled={busy !== null}
          color={colors.text}
          mutedColor={colors.textMuted}
          successColor={colors.success}
          dangerColor={colors.danger}
          warningColor={colors.warning}
        />
        <View style={styles.spacer} />
        <PrimaryButton
          label="Reset permission prompts"
          variant="ghost"
          onPress={handleResetPermissionPrompts}
        />
        <Text style={[styles.warning, { color: colors.textMuted }]}>
          If a permission shows "Never ask again" the OS won't show our dialog.
          Open Settings → Apps → Meter Tracker → Permissions to re-enable it.
        </Text>
      </Card>

      <Card title="About" style={styles.section}>
        <View style={styles.row}>
          <Text style={[styles.rowTitle, { color: colors.text }]}>App</Text>
          <Text style={[styles.rowValue, { color: colors.textMuted }]}>
            {APP_NAME}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.rowTitle, { color: colors.text }]}>Version</Text>
          <Text style={[styles.rowValue, { color: colors.textMuted }]}>
            {APP_VERSION}
          </Text>
        </View>
      </Card>
    </ScrollView>
  );
}

interface PermissionRowProps {
  label: string;
  hint: string;
  status: PermissionStatusMap[PermissionKind] | undefined;
  onRequest: () => void;
  disabled?: boolean;
  color: string;
  mutedColor: string;
  successColor: string;
  dangerColor: string;
  warningColor: string;
}

function PermissionRow({
  label,
  hint,
  status,
  onRequest,
  disabled,
  color,
  mutedColor,
  successColor,
  dangerColor,
  warningColor,
}: PermissionRowProps) {
  const statusLabel: Record<
    NonNullable<PermissionRowProps['status']>,
    { text: string; tint: string }
  > = {
    granted: { text: 'Granted', tint: successColor },
    denied: { text: 'Denied', tint: dangerColor },
    never_ask_again: { text: 'Blocked (Never ask again)', tint: warningColor },
    unavailable: { text: 'Not applicable', tint: mutedColor },
  };
  const meta = status ? statusLabel[status] : { text: 'Checking…', tint: mutedColor };
  const buttonLabel =
    status === 'granted'
      ? 'Re-check'
      : status === 'never_ask_again'
        ? 'Open settings hint'
        : 'Request';
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <Text style={[styles.rowTitle, { color }]}>{label}</Text>
        <Text style={[styles.rowHint, { color: mutedColor }]}>{hint}</Text>
        <Text style={[styles.permTag, { color: meta.tint }]}>{meta.text}</Text>
      </View>
      <PrimaryButton
        label={buttonLabel}
        variant="outline"
        onPress={onRequest}
        disabled={disabled}
        style={styles.permButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  section: { marginTop: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  flex: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowHint: { fontSize: 12, marginTop: 2 },
  rowValue: { fontSize: 14 },
  spacer: { height: 10 },
  dividerSm: { height: 12 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  warning: { fontSize: 12, marginTop: 8, lineHeight: 17, fontStyle: 'italic' },
  permTag: { fontSize: 12, marginTop: 4, fontWeight: '700' },
  permButton: { minWidth: 110, marginLeft: 12 },
});
