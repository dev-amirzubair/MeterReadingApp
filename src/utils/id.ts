/**
 * Lightweight unique ID generator (RFC4122-ish, NOT cryptographically random).
 * Good enough for local-only entity IDs; replace with `react-native-uuid` if
 * you ever sync to a backend.
 */
export function uid(): string {
  const rand = () =>
    Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  return `${rand()}${rand()}-${rand()}-${rand()}-${rand()}-${rand()}${rand()}${rand()}`;
}
