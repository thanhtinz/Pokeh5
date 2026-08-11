<?php

	session_start();

	
	$db_host='localhost';
$db_user='';
$db_pass='';
$db_name='';
$mysql=mysql_connect($db_host,$db_user,$db_pass) OR die("<center><br/>Lỗi:<br/>Máy chủ bảo trì</center>");
mysql_query('SET NAMES `utf8`',$mysql);
mysql_select_db($db_name,$mysql) OR die('<center><br/>Lỗi:<br/>hệ Thống Bảo Trì</center>');

date_default_timezone_set('Asia/Ho_Chi_Minh');


////users////
	class map {
		public $id = 0;
		public $name = null;
		public $code = 0;
		public $music = null;
		public $west = null;
		public $east = null;
		public $type = null;
		public $encounters = null;
		public $grass = null;

		public function map($id) {
			$map = mysql_fetch_array(mysql_query("SELECT * FROM `maps` WHERE `id` = '" . mysql_real_escape_string($id) . "'"));

			foreach($map as $key => $value) {
				$this->{$key} = $value;
			}

			$this->encounters = json_decode($this->encounters);
			if (!isset($this->encounters)) {
				$this->encounters = new stdClass();
			}

			$this->grass = json_decode($this->grass);
			if (!isset($this->grass)) {
				$this->grass = new stdClass();
			}
		}
	}
	
	class nhiemvu {
		public $id = 0;

public function ten($id) {
   			$npc = mysql_fetch_array(mysql_query("SELECT * FROM `npcs` WHERE `id` = '" . mysql_real_escape_string($id) . "'"));
 return $npc[name];
}

		public function nhiemvu($id) {
			$map = mysql_fetch_array(mysql_query("SELECT * FROM `ducnghia_nhiemvu` WHERE `nhiemvu` = '" . mysql_real_escape_string($id) . "'"));

			foreach($map as $key => $value) {
				$this->{$key} = $value;
			}

		

			$this->ducnghia = json_decode($this->ducnghia);
			if (!isset($this->ducnghia)) {
				$this->ducnghia = new stdClass();
			}
		}
		
public function add($id, $amount) {
			$this->ducnghia->{$id} = $amount;
			mysql_query("UPDATE `ducnghia_nhiemvu` SET `ducnghia` = '" . json_encode($this->ducnghia,JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT) . "' WHERE `id` = '" . $this->id . "'");

			return $this->ducnghia->{$id};
		}				
		
	}	
	
	class user {
		public $id = 0;
		public $username = null;
		public $team = null;
		public $billsPC = null;
		public $money = 0;
		public $pokedex = null;
		public $map = 0;
		public $sound = 0;
		public $music = 0;
		public $heart = 0;
		public $premium = 0;
		public $battle = 0;
		public $npcsPhase = 0;
		public $statistics = 0;
public function check_quest($id) {
			if ($this->quests->{$id}->finished > 0) {
				return 2;
			} else if ($this->quests->{$id}->started > 0) {
				return 1;
			}

			return 0;
		}

		public function start_quest($id) {
			$this->quests->{$id}->started = time();

			mysql_query("UPDATE `users` SET `quests` = '" . json_encode($this->quests) . "' WHERE `id` = '" . $this->id . "'");

			return $this->quests->{$id}->started;
		}

		public function finish_quest($id) {
			$this->quests->{$id}->finished = time();

			mysql_query("UPDATE `users` SET `quests` = '" . json_encode($this->quests) . "' WHERE `id` = '" . $this->id . "'");

			return $this->quests->{$id}->finished;
		}

		public function getNpcPhase($id) {
			return (int) $this->npcsPhase->{$id};
		}

		public function setNpcPhase($id, $phase) {
			$this->npcsPhase->{$id} = $phase;

			if ($this->npcsPhase->{$id} < 1) {
				unset($this->npcsPhase->{$id});
			}

			mysql_query("UPDATE `users` SET `npcsPhase` = '" . json_encode($this->npcsPhase) . "' WHERE `id` = '" . $this->id . "'");
		}
		public function user($id) {
			$user = mysql_fetch_array(mysql_query("SELECT * FROM `users` WHERE `id` = '" . mysql_real_escape_string($id) . "'"));

			foreach($user as $key => $value) {
				$this->{$key} = $value;
			}

$this->code = json_decode($this->code);
			if (!isset($this->code)) {
				$this->code = new stdClass();
			}
		
			$this->map = json_decode($this->map);
			if (!isset($this->map)) {
				$this->map = new stdClass();
			}
			
				$this->nhiemvu = json_decode($this->nhiemvu);
			if (!isset($this->nhiemvu)) {
				$this->nhiemvu = new stdClass();
			}
			
				$this->ducnghia = json_decode($this->ducnghia);
			if (!isset($this->ducnghia)) {
				$this->ducnghia = new stdClass();
			}

			$this->vatpham = json_decode($this->vatpham);
			if (!isset($this->vatpham)) {
				$this->vatpham = new stdClass();
			}
			

$this->item = json_decode($this->item);
			if (!isset($this->item)) {
				$this->item = new stdClass();
			}
			


		}
		
public function nhiemvu($id, $amount) {
			$this->nhiemvu->{$id} = $amount;
			mysql_query("UPDATE `users` SET `nhiemvu` = '" . json_encode($this->nhiemvu,JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT) . "' WHERE `id` = '" . $this->id . "'");

			return $this->nhiemvu->{$id};
		}		

		public function cvatpham($id) {
			return (int) $this->vatpham->{$id};
		}
		
		public function citem($id) {
			return (int) $this->item->{$id};
		}

		public function setvatpham($id, $amount) {
			$this->vatpham->{$id} += $amount;
			mysql_query("UPDATE `users` SET `vatpham` = '" . json_encode($this->vatpham,JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT) . "' WHERE `id` = '" . $this->id . "'");

			return $this->vatpham->{$id};
		}
		
	
		
			public function setitem($id, $amount) {
			$this->item->{$id} += $amount;
			mysql_query("UPDATE `users` SET `item` = '" . json_encode($this->item,JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT) . "' WHERE `id` = '" . $this->id . "'");
			return $this->item->{$id};
		}
		
		public function setducnghia($id, $amount) {
			$this->ducnghia->{$id} = $amount;
			mysql_query("UPDATE `users` SET `ducnghia` = '" . json_encode($this->ducnghia,JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT) . "' WHERE `id` = '" . $this->id . "'");

			return $this->ducnghia->{$id};
		}
		
		
		public function mysql($id, $amount) {
			mysql_query("UPDATE `users` SET $id  '" . $amount . "' WHERE `id` = '" . $this->id . "'");

			return 'ok';
		}
		
		

	public function cball($id) {
			return (int) $this->item->{$id};
		}		


	public function setcode($id,$id2,$dulieu) {
			$this->code->{$id}->{$id2} = $dulieu;
			mysql_query("UPDATE `users` SET `code` = '" .json_encode($this->code,JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT) . "' WHERE `id` = '" . $this->id . "'");
			return $this->code->{$id}->{$id2};
		}
		
	public function lichsu($dulieu) {
			$this->code->lichsu->{''.time().''}->noidung = $dulieu;

			mysql_query("UPDATE `users` SET `code` = '" .json_encode($this->code,JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT) . "' WHERE `id` = '" . $this->id . "'");

			return $this->code->lichsu;
		}			
		
		
	public function xoacode($id,$id2) {
			unset($this->code->{$id}->{$id2});
			mysql_query("UPDATE `users` SET `code` = '" . json_encode($this->code,JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT) . "' WHERE `id` = '" . $this->id . "'");

			return $this->code->{$id}->{$id2};
		}
		
		public function nhanvat() {
		   $skinx = mysql_fetch_array(mysql_query("SELECT * FROM `ducnghia_shopnhanvat` WHERE `img` = '" . $this->sprite . "'"));
 return $skinx[thuong];
		}
	
	}


$datauser = new user($_SESSION['id']);
$user_id = $datauser->id;
$user = $datauser;
$gebruiker = $datauser;
	
	function json($abc){

	    return json_encode($abc,JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT);
	    
	}
	
	if($user_id>0) {
	    if($datauser->nhiemvu->nhiemvu <=0) {
	        $datauser->nhiemvu('nhiemvu',1);
	    }

if($datauser->nhiemvu->id <=0) {
    $kv = new nhiemvu($datauser->nhiemvu->nhiemvu);
    if($kv->id !=0 AND $kv->ducnghia->loai=="giaotiep") {
  $datauser->nhiemvu('id',$kv->id); 
       $datauser->nhiemvu('npc',$kv->ducnghia->npc);   
       $datauser->nhiemvu('ten',$kv->ducnghia->ten);   
       $datauser->nhiemvu('name',$kv->ten($kv->ducnghia->npc));   
       
       $datauser->nhiemvu('text',$kv->ducnghia->text);   
       $datauser->nhiemvu('loai',$kv->ducnghia->loai);   
       $datauser->nhiemvu('pokemon',$kv->ducnghia->pokemon);   
       $datauser->nhiemvu('song',0);   
       $datauser->nhiemvu('can',0);          
        
    }
    
  
    
}	    
	    
	   if($datauser->nhiemvu->loai=="level" AND $datauser->nhiemvu->id>=1){
             	            $datauser->nhiemvu('song',$datauser->level);
 
             	}   
             	
	    $datauser->setcode('myip',$_SERVER["SERVER_NAME"],date('h:m:s d/m/Y'));
	    
	    if($datauser->ducnghia->hp ==1 AND $datauser->ducnghia->timehp < time()) {
	  
	          $datauser->setducnghia('hp',0);

	    mysql_query("UPDATE `pokemon_speler` SET `leven`=`levenmax`,`effect`='' WHERE `user_id`='" .$gebruiker->id."' AND `opzak_nummer` = '1'");mysql_query("UPDATE `pokemon_speler` SET `leven`=`levenmax`,`effect`='' WHERE `user_id`='" .$gebruiker->id."' AND `opzak_nummer` = '2'");mysql_query("UPDATE `pokemon_speler` SET `leven`=`levenmax`,`effect`='' WHERE `user_id`='" .$gebruiker->id."' AND `opzak_nummer` = '3'");mysql_query("UPDATE `pokemon_speler` SET `leven`=`levenmax`,`effect`='' WHERE `user_id`='" .$gebruiker->id."' AND `opzak_nummer` = '4'"); mysql_query("UPDATE `pokemon_speler` SET `leven`=`levenmax`,`effect`='' WHERE `user_id`='" .$gebruiker->id."' AND `opzak_nummer` = '5'");mysql_query("UPDATE `pokemon_speler` SET `leven`=`levenmax`,`effect`='' WHERE `user_id`='" .$gebruiker->id."' AND `opzak_nummer` = '6'");     
	    }
	    
	    
	}
	
	function t($text,$b) {
	    ///vietnam
	    if($_SESSION[ngonngu]!='en') {
	        $viet = $text;
	    } else {
	    ///tiếng anh
	    	$check = mysql_fetch_assoc(mysql_query("SELECT * FROM `ducnghia_ngonngu` WHERE `vi` = '".$text."'"));
if($check[id]>=1) {
    $viet = $check[en];
}else {
$post = [
    'text_to_translate' => $text,
    'source_lang' => 'vi',
    'translated_lang' => 'en', ///vi = Việt Qua => Anh,en = Anh => Việt
];
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://www.translate.com/translator/ajax_translate');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($post));
$response = curl_exec($ch);
$obj = json_decode($response);
$viet = $obj->translated_text;

                   mysql_query("INSERT INTO `ducnghia_ngonngu` SET `vi` = '".$text."',`en` = '".mysql_real_escape_string($viet)."' ");

}
}
return $viet;

	}
	
	
	
	//cauhoi
	class cauhoi {
		public $id = 0;
	

		public function cauhoi($id) {
			$duc = mysql_fetch_array(mysql_query("SELECT * FROM `ducnghia_cauhoi` WHERE `id` = '" . mysql_real_escape_string($id) . "'"));

			foreach($duc as $key => $value) {
				$this->{$key} = $value;
			}

		

			$this->ducnghia = json_decode($this->ducnghia);
			if (!isset($this->ducnghia)) {
				$this->ducnghia = new stdClass();
			}
		}
	}
	
	//
	class npcs {
		public $id = 0;
	

		public function npcs($id) {
			$duc = mysql_fetch_array(mysql_query("SELECT * FROM `npcs` WHERE `id` = '" . mysql_real_escape_string($id) . "'"));

			foreach($duc as $key => $value) {
				$this->{$key} = $value;
			}

		

			$this->ducnghia = json_decode($this->ducnghia);
			if (!isset($this->ducnghia)) {
				$this->ducnghia = new stdClass();
			}
		}

public function xoa($id) {
			unset($this->ducnghia->{$id});
			mysql_query("UPDATE `npcs` SET `ducnghia` = '" . json_encode($this->ducnghia,JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT) . "' WHERE `id` = '" . $this->id . "'");

			return $this->ducnghia->{$id};
		}		
	
public function add($ccc,$textxxx, $amount) {
			$this->ducnghia->$ccc->$textxxx = $amount;
			mysql_query("UPDATE `npcs` SET `ducnghia` = '" . json_encode($this->ducnghia,JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT) . "' WHERE `id` = '" . $this->id . "'");

			return $this->ducnghia->{$ccc};
		}	
		
	}
	
	
	function dichson($strurl) {
	    
     $strurl = preg_replace("/(#)/", "'", $strurl);
 
  return $strurl;
  }
  
  function n_select($table,$where) {
 $n_ducnghia = mysql_fetch_assoc(mysql_query("SELECT * FROM `$table` WHERE $where"));   
 return $n_ducnghia;
}	  
function n_query($table,$data,$where) {
  $n_ducnghia =   mysql_query("UPDATE `$table` SET $data WHERE $where");
     return $n_ducnghia;

}

?>
