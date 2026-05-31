import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useMMKVString } from 'react-native-mmkv';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppTheme } from '../../theme/useAppTheme';
import { storage } from '../../storage/mmkv';
import { STORAGE_KEYS } from '../../constants/app';
import type { BillCheckerStackParamList } from './navigation';

type Props = NativeStackScreenProps<BillCheckerStackParamList, 'BillWebView'>;

/**
 * JS injected into the bill page once it has loaded. It does two best-effort
 * things:
 *
 *   1. Try to autofill the consumer-number field if we can spot one. This
 *      handles DISCO pages where the URL query string isn't picked up.
 *   2. Wire up a small `__bridgeCopy(text)` helper that React Native can call
 *      via `injectJavaScript` to copy text into the device clipboard from
 *      inside the page (using the page's secure-origin Clipboard API).
 *
 * Designed to be a pure side-effect string: never throws, never depends on
 * external libs, and always ends with `true;` so RN's `injectedJavaScript`
 * runtime is happy.
 */
function buildPageBootstrap(consumerNumber: string): string {
  const safe = consumerNumber.replace(/[\\"\n\r]/g, '');
  return `
    (function(){
      try {
        var consumer = ${JSON.stringify(safe)};
        if (consumer) {
          // Autofill: walk every input/textarea on the page and pick the
          // most-likely "consumer / refno / account number" field.
          var inputs = Array.prototype.slice.call(
            document.querySelectorAll('input, textarea')
          );
          var matchers = [
            /refno/i, /reference/i, /consumer/i, /account/i, /custid/i, /acno/i, /bill[_-]?id/i
          ];
          var picked = null;
          for (var i=0; i<inputs.length; i++) {
            var el = inputs[i];
            var txt = ((el.name||'') + ' ' + (el.id||'') + ' ' + (el.placeholder||'') + ' ' + (el.getAttribute && (el.getAttribute('aria-label')||'')||'')).toLowerCase();
            for (var j=0; j<matchers.length; j++) {
              if (matchers[j].test(txt)) { picked = el; break; }
            }
            if (picked) break;
          }
          if (picked && !picked.value) {
            picked.value = consumer;
            picked.dispatchEvent(new Event('input', { bubbles: true }));
            picked.dispatchEvent(new Event('change', { bubbles: true }));
            picked.focus();
          }
        }

        // Bridge: lets the RN side ask the page to write to the device
        // clipboard via the (secure-origin) Clipboard API. This works on
        // Android System WebView 89+ for HTTPS origins.
        window.__bridgeCopy = function(text){
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(text).then(function(){
                window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'copy:ok', text: text }));
              }).catch(function(err){
                window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'copy:err', error: String(err && err.message || err) }));
              });
              return true;
            }
            // Fallback: temporarily insert a textarea and use execCommand.
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.focus(); ta.select();
            var ok = false;
            try { ok = document.execCommand('copy'); } catch(e) {}
            document.body.removeChild(ta);
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: ok ? 'copy:ok' : 'copy:err', text: text, fallback: true }));
            return ok;
          } catch (e) {
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'copy:err', error: String(e && e.message || e) }));
            return false;
          }
        };
      } catch(e) {
        // Silently ignore — the page still works without our autofill/bridge.
      }
      true;
    })();
  `;
}

const showToast = (msg: string) => {
  if (typeof ToastAndroid !== 'undefined' && ToastAndroid?.show) {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert(msg);
  }
};

export function BillWebViewScreen({ route, navigation }: Props) {
  const { url, title, meterName, consumerNumber, discoLabel } = route.params;
  const { colors } = useAppTheme();
  const webRef = useRef<WebView>(null);
  const [, setLastUrl] = useMMKVString(STORAGE_KEYS.LAST_BILL_URL, storage);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  const bootstrap = useMemo(
    () => buildPageBootstrap(consumerNumber ?? ''),
    [consumerNumber],
  );

  useEffect(() => {
    navigation.setOptions({ title });
    setLastUrl(url);
    if (consumerNumber) {
      // Up-front hint so the user knows what to do once the page loads.
      showToast(`Tap "Copy" to put ${consumerNumber} on the clipboard.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, title, url]);

  const onCopyConsumer = useCallback(() => {
    if (!consumerNumber) {
      return;
    }
    // Ask the in-page bridge to copy. The bridge posts a `copy:ok` message
    // back which we toast once received (see onMessage below). If the page
    // hasn't loaded yet we still inject — the script will simply no-op.
    const safe = consumerNumber.replace(/[\\"\n\r]/g, '');
    webRef.current?.injectJavaScript(
      `window.__bridgeCopy && window.__bridgeCopy(${JSON.stringify(safe)}); true;`,
    );
    // Optimistic toast so the user has immediate feedback even on slow pages.
    showToast(`Consumer number copied: ${consumerNumber}`);
  }, [consumerNumber]);

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        text?: string;
        error?: string;
      };
      if (data.type === 'copy:err') {
        // Bridge reported failure (e.g. older WebView). Long-press fallback
        // is still available on the header text.
        showToast('Auto-copy failed. Long-press the number to copy.');
      }
    } catch {
      // Not a JSON message — ignore.
    }
  }, []);

  // Hardware back inside the WebView: keep the user inside the page until
  // they hit the start of history.
  const onBackPress = useCallback(() => {
    if (canGoBack) {
      webRef.current?.goBack();
    } else {
      navigation.goBack();
    }
  }, [canGoBack, navigation]);

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      {consumerNumber ? (
        <View
          style={[
            styles.headerBanner,
            { backgroundColor: colors.surface, borderBottomColor: colors.border },
          ]}>
          <View style={styles.headerLeft}>
            {meterName ? (
              <Text style={[styles.headerMeter, { color: colors.text }]}>
                {meterName}
                {discoLabel ? (
                  <Text style={[styles.headerDisco, { color: colors.textMuted }]}>
                    {' · '}
                    {discoLabel}
                  </Text>
                ) : null}
              </Text>
            ) : null}
            <Text
              selectable
              style={[styles.headerConsumer, { color: colors.primary }]}>
              {consumerNumber}
            </Text>
            <Text style={[styles.headerHint, { color: colors.textMuted }]}>
              Tap Copy or long-press the number above to copy.
            </Text>
          </View>
          <Pressable
            onPress={onCopyConsumer}
            style={({ pressed }) => [
              styles.copyBtn,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.75 : 1,
              },
            ]}>
            <Text style={styles.copyBtnText}>Copy</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.flex}>
        <WebView
          ref={webRef}
          source={{ uri: url }}
          startInLoadingState
          injectedJavaScript={bootstrap}
          onMessage={onMessage}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={() => setLoading(false)}
          onNavigationStateChange={state => {
            setCanGoBack(state.canGoBack);
            setCanGoForward(state.canGoForward);
          }}
          allowsBackForwardNavigationGestures
        />
        {loading ? (
          <View style={styles.loaderOverlay} pointerEvents="none">
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : null}
      </View>

      <View
        style={[
          styles.toolbar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ]}>
        <ToolbarButton
          label="‹ Back"
          color={canGoBack ? colors.primary : colors.textMuted}
          onPress={onBackPress}
          disabled={!canGoBack && false /* allow exit */}
        />
        <ToolbarButton
          label="Forward ›"
          color={canGoForward ? colors.primary : colors.textMuted}
          onPress={() => webRef.current?.goForward()}
          disabled={!canGoForward}
        />
        <ToolbarButton
          label="↻ Reload"
          color={colors.primary}
          onPress={() => webRef.current?.reload()}
        />
        <ToolbarButton
          label="✕ Done"
          color={colors.danger}
          onPress={() => navigation.goBack()}
        />
      </View>
    </View>
  );
}

interface ToolbarButtonProps {
  label: string;
  color: string;
  onPress: () => void;
  disabled?: boolean;
}

function ToolbarButton({ label, color, onPress, disabled }: ToolbarButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.toolbarBtn, pressed && styles.pressed]}>
      <Text
        style={[styles.toolbarBtnText, { color, opacity: disabled ? 0.4 : 1 }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  headerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: { flex: 1, paddingRight: 10 },
  headerMeter: {
    fontSize: 13,
    fontWeight: '700',
  },
  headerDisco: {
    fontSize: 12,
    fontWeight: '500',
  },
  headerConsumer: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  headerHint: { fontSize: 11, marginTop: 2 },
  copyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  copyBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolbar: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    justifyContent: 'space-around',
  },
  toolbarBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  toolbarBtnText: { fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.6 },
});
