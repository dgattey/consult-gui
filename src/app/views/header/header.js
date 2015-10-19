angular.module('app.views.header', [])
.controller('HeaderCtrl', function($scope, $rootScope, $q, $timeout, scheduleLoader){
	$scope.isCollapsed = true;
	$scope.navigation = [
		{ state:'home', title: 'Home' },
		{ state:'schedule', title: 'Schedule' },
		{ state:'sub', title: 'Sub' },
		{ state:'people', title: 'People' }
	];

	// Helper to convert string time to decimal rep: i.e. '08:20' -> 8.33333
	function timeToDecimal(str) {
		var times = str.split(':');
		return parseInt(times[0], 10) + parseInt(times[1], 10) / 60.0;
	}

	function setStatus(data) {
		var curr, next;

		// Loop through this week's slots and get the current person
		var days = scheduleLoader.slotsToDays(data);
		var slots = days[data.current.day-1].slots;
		for (var id in slots) {
			var slot = slots[id];
			if (data.current.time >= timeToDecimal(slot.start) &&
				data.current.time <= timeToDecimal(slot.end)) {
				curr = slot.free ? 'FREE' : slot.user;
			}
			// If there's another slot and it's not free, then use it
			else if (curr && !slot.free) {
				next = slot.user;
				break;
			}
		}
		
		// Actually apply changes
		$scope.next = next;
		$scope.curr = curr;

		// Set status at the next hour
		var d = new Date();
		var secondsPastHour = d.getMinutes()*60 + d.getSeconds();
		var interval = 60*60*1000 - secondsPastHour*1000;
		$timeout(setStatus, interval, true, data);
	}

	/*
	 * Load the current week's data for the x is up, x is up next status
	 * bar and save when we loaded it. Set a timer to update every min
	 * in case we're already near the end of the hour
	 */
	scheduleLoader.loadWeek()
	.then(setStatus);
});
