<?php
echo'MÁY CHỦ BẢO TRÌ ĐỊNH KÌ.VUI LÒNG TRỞ LẠI SAU.';
exit();
include_once('templates/config.php');
	include_once('templates/lib.php');
	include_once('templates/ducnghia.php');
include_once('templates/header.php');

if($_SERVER["SERVER_NAME"]=="pkmw.tk"){
    $_SESSION['ngonngu']='en';
}


$_SESSION['ducnghia_game'] = 'DEV : TRAN DO DUC NGHIA
birthday : 27/06/2004
LIVE : VIET NAM
MY FACEBOOK : fb.com/ducnghiast
MY EMAIL : trandoducnghia@gmail.com
Time : '.date("Y-m-d").'
YOU IP : '.$_SERVER['REMOTE_ADDR'].'
ID:'.rand(1000000000000000,1999900000000000009).'';
$decode = base64_encode($_SESSION['ducnghia_game']);
?>


<script type='text/javascript' src='sql/game.js?loadgame'></script>

<style>
/* Full-screen shell. The wallpaper that used to sit behind a 490px column is
   gone; the game frame now fills the window. */
html, body {
	height: 100%;
	margin: 0;
	padding: 0;
	overflow: hidden;
	background-color: #101418;
}
body,p,form,table,img,td,tr,li,ul{margin:0;padding:0;border:0;}
body{
    font-size: 13px;
    font-family: Comfortaa;
    line-height: 20px;
}
ducnghia {
	display: block;
	position: relative;
	width: 100%;
	height: 100%;
	overflow: hidden;
}
/* The frame is positioned and scaled by sizegame() in sql/game.js. */
ducnghia iframe {
	display: block;
	border: 0;
}
</style>
<ducnghia>Đang tải dữ liệu trò chơi.</ducnghia>
        </body>
        </html>
   