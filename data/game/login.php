<?php

/**
 * Account endpoints: create character, log in, verify account.
 *
 * The SQL that used to live here has moved into Pokeh5\Auth. The JSON keys in
 * $j and the plain-text replies are unchanged, so sql/data.js needs no edits.
 */

use Pokeh5\Auth;

$thongbao  = t('Trò chơi dành cho người 12+.Chơi quá 180 phút sẽ có hại cho sức khỏe.');
$taikhoan  = trim((string) ($_POST['taikhoan'] ?? ''));
$matkhau   = (string) ($_POST['matkhau'] ?? '');
$baotri    = 0;
$uid       = 1000000;
$baotrimsg = t('bảo trì cập nhật phiên bản 4.0 mời các bạn quay lại sau.');

$j = [];

/**
 * Fill the shared part of the login/registration reply.
 *
 * @param array<string, mixed> $j
 */
function login_payload(array &$j, user $user, string $thongbao): void
{
    $map = new map($user->map->id);

    $j['map']      = $map->code;
    $j['name']     = $map->name;
    $j['thongbao'] = $thongbao;
    $j['uid']      = $user->id;
    $j['music']    = $user->sound;
    $j['uidname']  = $user->username;
    $j['skin']     = $user->sprite;
    $j['viettat']  = $user->viettat;
    $j['icon']     = $user->icon;

    $_SESSION['user_id'] = $user->id;
    $_SESSION['id']      = $user->id;
    $_SESSION['naam']    = $user->username;
}

if (isset($_POST['regchoi'])) {
    if ($baotri == 1) {
        $j['ducnghia'] = t('Trò chơi đang bảo trì.Đọc thông báo để biết thêm chi tiết.');
    } elseif (!Auth::isValidName($taikhoan)) {
        $j['ducnghia'] = t('Tên nhân vật chỉ được phép dùng kí tự A-Z,0-9,lớn hơn 4 kí tự và nhỏ hơn 19 kí tự.');
    } elseif (Auth::characterNameTaken($taikhoan)) {
        $j['ducnghia'] = t('Tên nhân vật này đã được sử dụng rồi.');
    } else {
        // The sprite comes from the character picker; only the files that
        // actually ship are accepted, so the value cannot be steered into
        // arbitrary paths by the client.
        $sprite    = (string) ($_POST['nhanvat'] ?? 'Hero-Male.png');
        $spriteDir = dirname(__DIR__, 2) . '/images/charactersets/';
        if (basename($sprite) !== $sprite || !is_file($spriteDir . $sprite)) {
            $sprite = 'Hero-Male.png';
        }

        try {
            $newId = Auth::createCharacter($taikhoan, $sprite);
        } catch (Throwable $e) {
            // Previously the INSERT failed silently under strict SQL mode and
            // the player was told registration had succeeded.
            error_log('[pokeh5][auth] createCharacter failed: ' . $e->getMessage());
            $j['ducnghia'] = t('Không tạo được nhân vật.Vui lòng thử lại.');
            echo json_encode($j);
            die;
        }

        $user = new user($newId);

        $j['ducnghia'] = t('Chơi thử thành công,hãy gặp NPC bất kì để xác minh tài khoản nhé.Hãy sử dụng các phím lên xuống để di chuyên ( phím ảo trên màn hình nếu chơi điện thoại) khi giao tiếp với NPC hãy ấn phím X(nếu trên máy tính) hoặc phím ảo A(trên điện thoại).Chúc các bạn có chuyến phưu lưu vui vẻ.');
        $j['ok']       = '1';

        login_payload($j, $user, $thongbao);

        // Registration replies use x/y; login replies use mx/my.
        $j['x'] = $user->map->x - 1;
        $j['y'] = $user->map->y - 1;
    }

    echo json_encode($j);
    die;
}

if (isset($_POST['choingay'])) {
    echo ' <center id="ducnghia_tip" style=" height: auto;

display: block;"><hr><img src="/images/items/Ultra%20ball.png">CHƠI MỚI<img src="/images/items/Poke ball.png"><hr>
<div  class="showitem" style="border: 2px solid;"><img id="choingay_img" src="/xml/nhanvat.php?nhanvat=Hero-Male.png&amp;nut=1"></div>

	     <Center><b onclick="choingay_nv(1)" class="viptxt"><< </b> [<b id="idnv">1</b>]  <b class="viptxt" onclick="choingay_nv(2)"> >> </b></center>

	     <b id="nvchon" style="display:none;">Hero-Male.png</b>

	     <img src="/images/items/Master ball.png">Tên N.Vật : <input id="taikhoan" class="input" type="text" value="" style="width: 40%;"> <br>
  <div class="nut" onclick="reg_choingay()">VÀO GAME</div> <br>
<div class="nut3" onclick="menu_login()">ĐĂNG NHẬP</div> <br>

	     </center>


  ';
}

if (isset($_POST['dangnhap'])) {
    $duc = Auth::login($taikhoan, $matkhau);

    if ($duc !== null && $duc['khoa'] > time()) {
        $timekkhoa     = $duc['khoa'] - time();
        $j['ducnghia'] = 'Tài khoản của bạn bị khóa.Liên hệ admin.( thời gian khóa : ' . $timekkhoa . 's) ';
    } elseif ($duc === null) {
        $j['ducnghia'] = t('Tài khoản hoặc mật khẩu chưa chính xác.');
    } elseif ($duc['id'] > $uid) {
        $j['ducnghia'] = $baotrimsg;
    } else {
        $j['ducnghia'] = 'Đăng nhập thành công';
        $j['ok']       = '1';

        // A fresh login starts a new session id, so a session fixated before
        // authentication cannot be reused afterwards.
        session_regenerate_id(true);

        $user = new user($duc['id']);

        if ($user->vua == 1 and $user->id != 1) {
            tin('VUA THÁCH ĐẤU ' . $user->username . ' vừa đăng nhập vào game.');
        }

        login_payload($j, $user, $thongbao);

        $j['mx']      = $user->map->x - 1;
        $j['my']      = $user->map->y - 1;
        $j['pokemon'] = $user->pokemon;
    }

    echo json_encode($j);
    die;
}

if (isset($_POST['dangki'])) {
    $currentId = (int) ($_SESSION['id'] ?? 0);

    if ($currentId === 0) {
        echo t('Bạn chưa đăng nhập.');
    } elseif (Auth::accountNameTaken($taikhoan)) {
        echo t('Tài khoản đã được đăng kí bởi người chơi khác.');
    } elseif ($datauser->test != 1) {
        echo t('Tên nhận vật đã xác minh rồi.');
    } elseif (!Auth::isValidName($taikhoan)) {
        echo t('Tài khoản chỉ được phép dùng kí tự A-Z,0-9,lớn hơn 4 kí tự và nhỏ hơn 19 kí tự.');
    } elseif (strlen($matkhau) < 6) {
        echo t('Mật khẩu phải từ 6 kí tự trở lên.');
    } else {
        try {
            Auth::linkAccount($currentId, $taikhoan, $matkhau);
            echo t('Xác minh tài khoản thành công.');
        } catch (RuntimeException $e) {
            echo t('Tài khoản đã được đăng kí bởi người chơi khác.');
        }
    }
}
