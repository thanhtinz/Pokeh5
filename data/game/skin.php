<?php

if(isset($_POST['shopskin'])) {
 
$ducnghia_kho=mysql_query("SELECT * FROM `ducnghia_shopnhanvat`");
    while($ducnghia_do=mysql_fetch_array($ducnghia_kho)) {
      
$ducnghia_img = '/xml/nhanvat.php?nhanvat='.$ducnghia_do['img'].'&nut=1';

	
	$out .='
<div onclick="xem_skin('.$ducnghia_do['id'].')" class="showitem" style="border: 2px solid;"><img src="'.$ducnghia_img.'"><div class="count count-vp-1">'.tien($ducnghia_do['gia']).'</div></div>		';

}
$nn = '<br><div class="kengang"></div><center>'.t('Cửa hàng').'</center><div class="kengang"></div>';
$n = $nn.$out;

echo $n;


}


if(isset($_POST['xemskin'])) {
 
$ducnghia_kho=mysql_fetch_array(mysql_query("SELECT * FROM `ducnghia_shopnhanvat` WHERE `id` = '".$_POST['id']."'"));

if($ducnghia_kho['hien']==1) {
    $nx = 'KHÔNG BÁN';
} else {
    $nx = 'MUA';
}
if($ducnghia_kho['loai']=='ruby') {
    $nxx = 'ruby';
} else {
    $nxx = 'xu';
}

if($ducnghia_kho['thuong']>0) {
    $themx = '<b class="viptxt">VIP +'.$ducnghia_kho['thuong'].'% xu,exp nhận được khi đánh pokemon hoang.</b> </br>  ';
}

$a['info'] = ''.$ducnghia_kho['ten'].' <br> '.$themx.'
'.t($ducnghia_kho['thongtin']).' <br>

    '.t('Giá bán').' :'.$ducnghia_kho['gia'].' '.$nxx.' <br>';
$a['ok'] ='<b class="viptxt nutchat" onclick="mua_skin('.$ducnghia_kho['id'].')">'.t($nx).'</b>';
echo json_encode($a);

}

if(isset($_POST['muaskin'])) {
 
$ducnghia_kho=mysql_fetch_array(mysql_query("SELECT * FROM `ducnghia_shopnhanvat` WHERE `id` = '".$_POST['id']."'"));

 if($datauser->$ducnghia_kho['loai'] < $ducnghia_kho['gia']) {
    $l = ''.t('Bạn không đủ tiền để mua.').'';
} 
 else if($ducnghia_kho['hien']==1) {
    $l = ''.t('Cửa hàng chúng tôi không có vật phẩm này').'';
}

else {
    $datauser->setcode('skin',$_POST['id'],1);
    $datauser->lichsu('Mua trang phục '.$ducnghia_kho['ten'].' mất '.$ducnghia_kho['gia'].' '.$ducnghia_kho['loai'].' ');
        mysql_query("UPDATE users SET $ducnghia_kho[loai] = $ducnghia_kho[loai]  - '".$ducnghia_kho['gia']."' WHERE user_id='$user_id'");
		             
		             $l = ''.t('Mua thành công.Cám ơn bạn đã ghé thăm.').'';
}

echo''.$l.'';

}


if(isset($_POST['doiskin'])) {
 

echo'<br><div class="kengang"></div><center>Cửa hàng</center><div class="kengang"></div>';

 foreach ($datauser->code->skin as $id => $soluong) {
          $vps = mysql_fetch_array(mysql_query("SELECT * FROM `ducnghia_shopnhanvat` WHERE `id` = '".$id."'"));
$ducnghia_img = '/xml/nhanvat.php?nhanvat='.$vps['img'].'&nut=1';

				    echo '<div onclick="ok_skin('.$id.')" class="showitem" style="border: 2px solid;"><img src="'.$ducnghia_img.'"><div class="count count-vp-1"></div></div>	';

					}  


}


if(isset($_POST['okdoi'])) {
 
      $vps = mysql_fetch_array(mysql_query("SELECT * FROM `ducnghia_shopnhanvat` WHERE `id` = '".$_POST['id']."'"));

if($datauser->code->skin->{$_POST['id']} <=0 ) {
    $l = 'lỗi rồi';
} else {
    
        mysql_query("UPDATE users SET sprite = '".$vps['img']."' WHERE user_id='$user_id'");
		             
		             $l = 'Thành công :3';
}
$a['nv'] = $vps['img'];
$a['ok'] ='<div class="infobox noborder">'.$l.'</div> ';
echo json_encode($a);
}