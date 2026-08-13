import { useEffect, useReducer } from 'preact/hooks';

import { account, type Account } from '../net/account';

/**
 * Đăng ký component nghe tài khoản.
 *
 * Cùng một cách với `useGame`: đối tượng là một cục có thể sửa tại chỗ, không
 * có gì để so, nên tín hiệu chỉ việc ép vẽ lại. Khác ở chỗ cái này đổi vài lần
 * một phút chứ không phải mười lần một giây.
 */
export function useAccount(): Account {
  const [, force] = useReducer((n: number) => n + 1, 0);

  useEffect(() => account.subscribe(() => force(undefined)), []);

  return account;
}
