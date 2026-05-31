import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface Props {
  /** Optional friendly label shown in the header. */
  label?: string;
  children: React.ReactNode;
}

interface State {
  error: Error | null;
  info: { componentStack?: string | null } | null;
}

/**
 * Wraps a screen / subtree and renders a visible error message when a
 * descendant throws while rendering. Without this, an exception inside a
 * screen (e.g. an undefined-property crash) takes down the entire app on
 * release builds with no on-device hint.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(
    error: Error,
    info: { componentStack?: string | null },
  ): void {
    this.setState({ error, info });
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary]', this.props.label ?? '', error, info);
    }
  }

  reset = () => this.setState({ error: null, info: null });

  render() {
    const { error, info } = this.state;
    if (!error) {
      return this.props.children;
    }
    return (
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Something went wrong</Text>
          {this.props.label ? (
            <Text style={styles.where}>in {this.props.label}</Text>
          ) : null}
          <Text style={styles.msg}>{error.message || 'Unknown error'}</Text>
          {error.stack ? (
            <Text style={styles.stack}>{error.stack}</Text>
          ) : null}
          {info?.componentStack ? (
            <Text style={styles.stack}>{info.componentStack}</Text>
          ) : null}
          <Pressable onPress={this.reset} style={styles.button}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1a0a0a' },
  content: { padding: 20, paddingTop: 60 },
  title: { color: '#ff6b6b', fontSize: 22, fontWeight: '800' },
  where: { color: '#ffaaaa', fontSize: 13, marginTop: 4, fontStyle: 'italic' },
  msg: {
    color: '#ffd6d6',
    fontSize: 15,
    marginTop: 14,
    lineHeight: 22,
  },
  stack: {
    color: '#ff9d9d',
    fontSize: 11,
    marginTop: 14,
    fontFamily: 'monospace',
    lineHeight: 15,
  },
  button: {
    marginTop: 24,
    backgroundColor: '#ff6b6b',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#1a0a0a', fontWeight: '800' },
});
