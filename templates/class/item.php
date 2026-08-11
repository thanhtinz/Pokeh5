<?php
	class item {
		public $id = 0;
		public $name = null;
		public $description = null;
		public $file = null;

		// PHP 4 style constructor: renamed to __construct().
		// PHP 8 removed same-name constructors, so `new item(...)` was
		// silently returning an unpopulated object and every read/write
		// against it was lost.
		public function __construct($id) {
			$item = mysql_fetch_array(mysql_query("SELECT * FROM `items` WHERE `id` = '" . mysql_real_escape_string($id) . "'"));

			foreach($item as $key => $value) {
				$this->{$key} = $value;
			}
		}
	}
?>