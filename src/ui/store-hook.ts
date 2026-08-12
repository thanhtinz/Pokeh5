import { useEffect, useReducer } from 'preact/hooks';

import { store } from '../game/store';
import type { PlayerState } from '../game/state';

/**
 * Re-renders the caller whenever the store changes.
 *
 * The store owns one mutable save object rather than producing new immutable
 * copies, so components read fields off it directly and this hook only needs
 * to force a render — there is no snapshot to diff.
 */
export function useStore(): PlayerState {
  const [, force] = useReducer((n: number) => n + 1, 0);
  // Wrapped rather than passed straight through: the dispatcher takes an
  // action argument that the store's zero-argument listener never supplies.
  useEffect(() => store.subscribe(() => force(undefined)), []);
  return store.state;
}
