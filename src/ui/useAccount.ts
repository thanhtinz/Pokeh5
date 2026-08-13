import { useEffect, useReducer } from 'preact/hooks';

import { account, type Account } from '../net/account';

/**
 * Đăng ký component nghe tài khoản.
 *
 * Cùng một cách với `useGame`: đối tượng là một cục có thể sửa tại chỗ, không
 * có gì để so, nên tín hiệu chỉ việc ép vẽ lại.
 *
 * Cái `force` ngay sau khi đăng ký không thừa. Effect chạy *sau* lần vẽ đầu,
 * nên bất cứ thay đổi nào xảy ra trong khoảng đó là một tín hiệu phát vào chỗ
 * không ai nghe. Mà đúng khoảng đó là chỗ `account.boot()` chạy xong khi máy
 * chưa có token nào — không có `await` nào để nhường lượt, nên nó đặt
 * `checked` rồi phát tín hiệu ngay trong lần đầu tiên. Thiếu dòng này thì
 * người chơi mới ngồi nhìn màn hình "đang tải" mãi mãi.
 */
export function useAccount(): Account {
  const [, force] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    const off = account.subscribe(() => force(undefined));
    force(undefined);
    return off;
  }, []);

  return account;
}
