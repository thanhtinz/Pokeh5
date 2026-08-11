<?php
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

			foreach($skill as $key => $value) {
				$this->{$key} = $value;
			}
		}
	}
?>