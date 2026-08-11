<?php
	// Columns are copied onto the object with $this->{$key} = $value, so the
	// property set is whatever the table has. PHP 8.2 deprecates undeclared
	// properties and PHP 9 makes them an error; this opts the class back in.
	#[\AllowDynamicProperties]
	class skill {
		public $id = 0;
		public $name = null;
		public $type = 0;
		public $accuracy = 0;
		public $power = 0;
		public $animation = 0;
		public $scope = 0;
		public $grade = null;

		// PHP 4 style constructor: renamed to __construct().
		// PHP 8 removed same-name constructors, so `new skill(...)` was
		// silently returning an unpopulated object and every read/write
		// against it was lost.
		public function __construct($id) {
			$skill = mysql_fetch_array(mysql_query("SELECT * FROM `skills` WHERE `id` = '" . mysql_real_escape_string($id) . "'"));

			// No such row: leave the declared defaults in place instead of
			// letting foreach() fail on the boolean false that a miss returns.
			if (!is_array($skill)) {
				return;
			}

			foreach($skill as $key => $value) {
				$this->{$key} = $value;
			}
		}
	}
?>