import { PermissionsAndroid, Platform, type Permission } from 'react-native';
import { storage } from '../../storage/mmkv';

/**
 * Single source of truth for runtime permissions on Android. iOS uses
 * info.plist + library-managed prompts so we don't need to drive anything
 * here for it.
 *
 * Order of operations on first launch:
 *   1. App boots → `requestStartupPermissions()` is called once.
 *   2. We ask for CAMERA, POST_NOTIFICATIONS and READ_MEDIA_IMAGES in turn.
 *   3. Whatever the user picks is fine — features fail gracefully when a
 *      permission is missing (camera button alerts, notifications no-op).
 *   4. We persist a flag so we never spam the user again on subsequent
 *      launches; they can re-request from the Settings screen.
 */

const ASKED_FLAG = 'permissions.startupAskedV1';

export type PermissionKind = 'camera' | 'notifications' | 'mediaImages';

export interface PermissionStatusMap {
  camera: 'granted' | 'denied' | 'never_ask_again' | 'unavailable';
  notifications: 'granted' | 'denied' | 'never_ask_again' | 'unavailable';
  mediaImages: 'granted' | 'denied' | 'never_ask_again' | 'unavailable';
}

const ANDROID_PERMS: Record<PermissionKind, Permission | null> = {
  camera: PermissionsAndroid.PERMISSIONS.CAMERA,
  // POST_NOTIFICATIONS only exists on API 33+. On older Android the constant
  // is missing, so we fall back to "granted" — notifications worked
  // implicitly there.
  notifications:
    (PermissionsAndroid.PERMISSIONS as Record<string, Permission | undefined>)
      .POST_NOTIFICATIONS ?? null,
  // READ_MEDIA_IMAGES only exists on API 33+. On older Android we fall back
  // to READ_EXTERNAL_STORAGE; on API 33+ that one is a no-op (the OS
  // returns granted without prompting).
  mediaImages:
    (PermissionsAndroid.PERMISSIONS as Record<string, Permission | undefined>)
      .READ_MEDIA_IMAGES ??
    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE ??
    null,
};

const RATIONALES: Record<
  PermissionKind,
  { title: string; message: string; buttonPositive: string; buttonNegative: string }
> = {
  camera: {
    title: 'Camera permission',
    message:
      'Meter Tracker needs the camera to scan meter readings (OCR). You can also pick photos from your gallery instead.',
    buttonPositive: 'Allow',
    buttonNegative: 'Not now',
  },
  notifications: {
    title: 'Notification permission',
    message:
      'Allow notifications so we can remind you each month to record your bill reading.',
    buttonPositive: 'Allow',
    buttonNegative: 'Not now',
  },
  mediaImages: {
    title: 'Photo access',
    message:
      'Allow access to your photos so you can pick existing meter pictures and run OCR on them.',
    buttonPositive: 'Allow',
    buttonNegative: 'Not now',
  },
};

const mapStatus = (
  status: typeof PermissionsAndroid.RESULTS[keyof typeof PermissionsAndroid.RESULTS],
): PermissionStatusMap[PermissionKind] => {
  if (status === PermissionsAndroid.RESULTS.GRANTED) return 'granted';
  if (status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN)
    return 'never_ask_again';
  return 'denied';
};

/**
 * Asks the OS for one permission. Returns "unavailable" on iOS or for
 * permissions that don't exist on the current Android level.
 */
export async function requestPermission(
  kind: PermissionKind,
): Promise<PermissionStatusMap[PermissionKind]> {
  if (Platform.OS !== 'android') {
    return 'unavailable';
  }
  const perm = ANDROID_PERMS[kind];
  if (!perm) {
    return 'unavailable';
  }
  try {
    const already = await PermissionsAndroid.check(perm);
    if (already) {
      return 'granted';
    }
    const status = await PermissionsAndroid.request(perm, RATIONALES[kind]);
    return mapStatus(status);
  } catch {
    return 'denied';
  }
}

export async function getPermissionStatus(
  kind: PermissionKind,
): Promise<PermissionStatusMap[PermissionKind]> {
  if (Platform.OS !== 'android') {
    return 'unavailable';
  }
  const perm = ANDROID_PERMS[kind];
  if (!perm) {
    return 'unavailable';
  }
  try {
    return (await PermissionsAndroid.check(perm)) ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

export async function getAllPermissionStatuses(): Promise<PermissionStatusMap> {
  const [camera, notifications, mediaImages] = await Promise.all([
    getPermissionStatus('camera'),
    getPermissionStatus('notifications'),
    getPermissionStatus('mediaImages'),
  ]);
  return { camera, notifications, mediaImages };
}

/**
 * Asks for camera, notifications, and gallery access in sequence. Safe to
 * call on every app start: it short-circuits after the first run via an
 * MMKV flag, and silently no-ops on iOS.
 */
export async function requestStartupPermissions(): Promise<PermissionStatusMap | null> {
  if (Platform.OS !== 'android') {
    return null;
  }
  if (storage.getBoolean(ASKED_FLAG)) {
    return null;
  }
  // Mark before asking so a dialog crash / app kill mid-flow doesn't loop.
  storage.set(ASKED_FLAG, true);

  const camera = await requestPermission('camera');
  const notifications = await requestPermission('notifications');
  const mediaImages = await requestPermission('mediaImages');
  return { camera, notifications, mediaImages };
}

/**
 * Resets the "asked once" flag so the orchestrator will prompt again on the
 * next launch (or the next call). Useful for the "Reset permission prompts"
 * settings entry.
 */
export function resetStartupAskedFlag(): void {
  storage.remove(ASKED_FLAG);
}
