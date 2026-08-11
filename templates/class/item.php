<?php
	// Columns are copied onto the object with $this->{$key} = $value, so the
	// property set is whatever the table has. PHP 8.2 deprecates undeclared
	// properties and PHP 9 makes them an error; this opts the class back in.
	#[\AllowDynamicProperties]
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

			// No such row: leave the declared defaults in place instead of
			// letting foreach() fail on the boolean false that a miss returns.
			if (!is_array($item)) {
				return;
			}

			foreach($item as $key => $value) {
				$this->{$key} = $value;
			}
		}
	}
?>