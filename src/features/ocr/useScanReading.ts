import { useCallback, useState } from 'react';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  type Asset,
  type CameraOptions,
  type ImageLibraryOptions,
  type ImagePickerResponse,
} from 'react-native-image-picker';
import { extractReadingFromImage, type OcrResult } from './extractReading';

export interface ScanResult extends OcrResult {
  /** local file URI of the captured / picked image */
  imageUri: string;
}

const COMMON_OPTIONS = {
  mediaType: 'photo' as const,
  // Down-size so OCR runs faster — the original ratio is preserved.
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.8 as const,
  includeExtra: false,
};

const cameraOptions: CameraOptions = {
  ...COMMON_OPTIONS,
  cameraType: 'back',
  saveToPhotos: false,
};

const libraryOptions: ImageLibraryOptions = {
  ...COMMON_OPTIONS,
  selectionLimit: 1,
};

const firstAsset = (resp: ImagePickerResponse): Asset | null => {
  if (resp.didCancel) {
    return null;
  }
  if (resp.errorCode) {
    // 'permission' / 'camera_unavailable' / 'others' — we surface a nicer
    // string so the calling screen can `Alert.alert` it without rummaging.
    const map: Record<string, string> = {
      camera_unavailable:
        'Camera is unavailable on this device or in an emulator. Try picking from the gallery instead.',
      permission:
        'Camera or photo permission is denied. Enable it from Settings → Apps → Meter Tracker → Permissions.',
      others: resp.errorMessage ?? 'The image picker reported an error.',
    };
    throw new Error(map[resp.errorCode] ?? resp.errorMessage ?? `Image picker error: ${resp.errorCode}`);
  }
  return resp.assets?.[0] ?? null;
};

const normalizeUri = (uri: string): string => {
  // ML Kit needs a path it can read. image-picker on Android usually returns
  // a `file://` URI for camera captures and a `content://` URI for some
  // gallery providers. The ML-Kit text-recognition module does accept both
  // schemes, but bare paths (`/storage/...`) need a `file://` prefix.
  if (Platform.OS === 'ios' && uri.startsWith('ph://')) {
    return uri;
  }
  if (uri.startsWith('file://') || uri.startsWith('content://')) {
    return uri;
  }
  if (uri.startsWith('/')) {
    return `file://${uri}`;
  }
  return uri;
};

/**
 * Asks for the runtime CAMERA permission on Android. Returns true if granted
 * (or not needed). On API 23+ the system shows the rationale dialog.
 *
 * `react-native-image-picker` already triggers this dialog itself, but on
 * some OEM ROMs (Vivo / Xiaomi MIUI) the picker silently returns
 * `errorCode = 'permission'` without prompting. Calling this first makes the
 * request flow predictable everywhere.
 */
async function ensureCameraPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  try {
    const status = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera permission',
        message: 'Meter Tracker needs the camera to scan your meter reading.',
        buttonPositive: 'OK',
        buttonNegative: 'Cancel',
      },
    );
    return status === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

/**
 * High-level OCR scan flow: launch camera or gallery, run OCR on the
 * result, return both the image URI and the suggested reading.
 */
export function useScanReading() {
  const [scanning, setScanning] = useState(false);

  const runOcr = useCallback(
    async (asset: Asset | null): Promise<ScanResult | null> => {
      if (!asset?.uri) {
        return null;
      }
      const imageUri = normalizeUri(asset.uri);
      try {
        const ocr = await extractReadingFromImage(imageUri);
        return { imageUri, ...ocr };
      } catch (e) {
        // OCR failed (e.g. unreadable file, ML Kit not initialised). Return
        // the image so the user can still save + type the value manually
        // instead of crashing the screen.
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn('[ocr] extractReadingFromImage failed', e);
        }
        return {
          imageUri,
          rawText: '',
          candidates: [],
          suggestedValue: null,
        };
      }
    },
    [],
  );

  const scanFromCamera = useCallback(async (): Promise<ScanResult | null> => {
    if (scanning) {
      return null;
    }
    setScanning(true);
    try {
      const granted = await ensureCameraPermission();
      if (!granted) {
        Alert.alert(
          'Camera permission needed',
          'Allow camera access from Settings → Apps → Meter Tracker → Permissions, then try again.',
        );
        return null;
      }
      const resp = await launchCamera(cameraOptions);
      const asset = firstAsset(resp);
      const result = await runOcr(asset);
      if (asset && result && result.suggestedValue === null) {
        Alert.alert(
          'No reading detected',
          "We couldn't find a plausible meter reading in that image. You can still save the image and type the value manually.",
        );
      }
      return result;
    } finally {
      setScanning(false);
    }
  }, [runOcr, scanning]);

  const scanFromLibrary = useCallback(async (): Promise<ScanResult | null> => {
    if (scanning) {
      return null;
    }
    setScanning(true);
    try {
      const resp = await launchImageLibrary(libraryOptions);
      const asset = firstAsset(resp);
      const result = await runOcr(asset);
      if (asset && result && result.suggestedValue === null) {
        Alert.alert(
          'No reading detected',
          "We couldn't find a plausible meter reading in that image. You can still save the image and type the value manually.",
        );
      }
      return result;
    } finally {
      setScanning(false);
    }
  }, [runOcr, scanning]);

  return { scanning, scanFromCamera, scanFromLibrary };
}
