angular.module('app.views.header', [])
.controller('HeaderCtrl', function($scope, $rootScope, $q, scheduleLoader){
	$scope.isCollapsed = true;
	$scope.navigation = [
		{ state:'home', title: 'Home' },
		{ state:'schedule', title: 'Schedule' },
		{ state:'sub', title: 'Sub' },
		{ state:'people', title: 'People' }
	];
	var intervalId;

	// Helper to convert string time to decimal rep: i.e. '08:20' -> 8.33333
	function timeToDecimal(str) {
		var times = str.split(':');
		return parseInt(times[0], 10) + parseInt(times[1], 10) / 60.0;
	}

	function setStatus(data) {
		// Reset
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
			// We know it's ordered, so this will be the next one
			else if (curr && !slot.free) {
				next = slot.user;
				break;
			}
		}

		// Tomorrow is the next one
		if (!next && data.current.day < 7) {
			slots = days[data.current.day].slots;
			for (id in slots) {
				var nextSlot = slots[id];
				if (!nextSlot.free) {
					next = nextSlot;
					break;
				}
			}
			
		}

		// TODO: Next week is the next person (not handled currently)
		
		// Actually apply changes
		$scope.next = next;
		$scope.curr = curr;

		// Set status at the next hour
		if (intervalId) clearInterval(intervalId);
		var d = new Date();
		var secondsPastHour = d.getMinutes()*60 + d.getSeconds();
		intervalId = setInterval(setStatus, 60*60*1000 - secondsPastHour*1000 );
		console.log($scope.next, $scope.curr);
	}

	/*
	 * Load the current week's data for the x is up, x is up next status
	 * bar and save when we loaded it. Set a timer to update every min
	 * in case we're already near the end of the hour
	 */
	scheduleLoader.loadWeek()
	.then(setStatus);
});
