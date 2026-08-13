import { useEffect, useReducer } from 'preact/hooks';

import { store, type Store } from '../game/store';

/**
 * Subscribes a component to the store.
 *
 * The store is a plain mutable object rather than immutable state, so there is
 * nothing to diff — a notification simply forces a render, and the components
 * read whatever is current. The tick marks the world dirty at sixty hertz but
 * only flushes at ten, so this is far cheaper than it looks.
 */
export function useGame(): Store {
  const [, force] = useReducer((n: number) => n + 1, 0);

  // Ép vẽ ngay sau khi đăng ký: effect chạy sau lần vẽ đầu, nên tín hiệu nào
  // phát trong khoảng đó là phát vào chỗ không ai nghe. Xem `useAccount`.
  useEffect(() => {
    const off = store.subscribe(() => force(undefined));
    force(undefined);
    return off;
  }, []);

  return store;
}
