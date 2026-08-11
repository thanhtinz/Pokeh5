<?php
	// Columns are copied onto the object with $this->{$key} = $value, so the
	// property set is whatever the table has. PHP 8.2 deprecates undeclared
	// properties and PHP 9 makes them an error; this opts the class back in.
	#[\AllowDynamicProperties]
	class monster {
		public $id = 0;
		public $name = null;
		public $hp = 0;
		public $type = 0;
		public $type2 = 0;
		public $abilities = null;
		public $base_exp = 0;
		public $exp_growth = 0;
		public $gender_rate = null;
		public $capture_rate = 0;
		public $evolutions = null;
		public $moves = null;
		public $sprites = null;
		public $follow = 0;

		// PHP 4 style constructor: renamed to __construct().
		// PHP 8 removed same-name constructors, so `new monster(...)` was
		// silently returning an unpopulated object and every read/write
		// against it was lost.
		public function __construct($id) {
			$monster = mysql_fetch_array(mysql_query("SELECT * FROM `monsters` WHERE `id` = '" . mysql_real_escape_string($id) . "'"));

			// No such row: leave the declared defaults in place instead of
			// letting foreach() fail on the boolean false that a miss returns.
			if (!is_array($monster)) {
				return;
			}

			foreach($monster as $key => $value) {
				$this->{$key} = $value;
			}

			$this->abilities = json_decode($this->abilities);
			if (!isset($this->abilities)) {
				$this->abilities = new stdClass();
			}
			$this->sprites = json_decode($this->sprites);
			if (!isset($this->sprites)) {
				$this->sprites = new stdClass();
			}
			$this->moves = json_decode($this->moves);
			if (!isset($this->moves)) {
				$this->moves = new stdClass();
			}
			$this->gender_rate = json_decode($this->gender_rate);
			if (!isset($this->gender_rate)) {
				$this->gender_rate = new stdClass();
			}
			$this->evolutions = json_decode($this->evolutions);
			if (!isset($this->evolutions)) {
				$this->evolutions = new stdClass();
			}
		}
	}
?>