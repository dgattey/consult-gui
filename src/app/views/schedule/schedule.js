angular.module('app.views.schedule', ['ui.bootstrap.tooltip', 'stringExtensions'])
.controller('ScheduleCtrl', function ($scope, $rootScope, $http, $q, $timeout, scheduleLoader, StringExtensions) {
	$rootScope.pageTitle = 'Schedule';
	$scope.headings = [];

	// Gets the first & last days of the week and saves it
	function saveCurrentWeekBounds() {
		return $q(function(resolve, reject) {
			var date = new Date(),
				day = date.getDay(),
				diffToMonday = date.getDate() - day + (day === 0 ? -6 : 1),
				monday = new Date(date.setDate(diffToMonday)),
				sunday = new Date(date.setDate(diffToMonday + 6));

			// Get the Monday of the week and save it for the frontend
			monday.setHours($scope.weekOffset * 7 * 24); // move it by x weeks
			$scope.weekStart = monday;

			// Get the Sunday of the week and save it for the frontend
			sunday.setHours($scope.weekOffset * 7 * 24); // move it by x weeks
			$scope.weekEnd = sunday;

			// Resolve with the total offset
			resolve($scope.weekOffset);
		});
	}

	// Converts string time to decimal representation: i.e. '08:20' -> 8.33333
	var timeToDecimal = function(str) {
		var times = str.split(':');
		return parseInt(times[0], 10) + parseInt(times[1], 10) / 60.0;
	};

	// Determines whether a given slot should show as current
	$scope.showsCurrent = function(day, time) {
		return $scope.weekOffset === 0 &&
			$scope.current.day == day.index &&
			$scope.current.time >= timeToDecimal(time.start) && 
			$scope.current.time <= timeToDecimal(time.end);
	};

	// Determines whether a given slot should show as disabled (in the past)
	$scope.showsPast = function(day, time) {
		if ($scope.weekOffset === 0) {
			// Either a past day 
			return $scope.current.day > day.index ||
			($scope.current.time > timeToDecimal(time.end) && $scope.current.day == day.index);
		}
		return $scope.weekOffset < 0;
	};

	// Saves data to frontend to visualize
	function visualize(data) {
		$scope.maxWeeks = data.meta.weeks;
		$scope.current = data.current;
		$scope.shouldHighlight = false;
		tmpDays = {};

		// Associates shift times with days
		for (var slot in data.shifts) {
			// Only include r and s slots if we're in reading period
			if (slot.indexOf('r') > -1 || slot.indexOf('s') > -1) {
				if (data.current.week < data.meta.weeksToReading) continue;
			}

			var val = data.shifts[slot];
			var dayName = val.substring(0, val.indexOf(' '));
			var startTime = val.substring(StringExtensions.nthOccurrence(val, ' ', 1)+1, val.indexOf('-'));
			var endTime = val.substring(val.indexOf('-')+1);

			var daySlots = tmpDays[dayName] ? tmpDays[dayName].slots : {};
			var free = data.slots[slot] == 'FREE';
			daySlots[slot] = {
				start: startTime,
				end: endTime,
				user: free ? 'Needs sub!' : data.slots[slot],
				free: free,
				selected: false
			};
			tmpDays[dayName] = {title:dayName, slots:daySlots};
		}

		// Order it and save it to frontend
		$scope.days = [
			tmpDays.Mon,
			tmpDays.Tue,
			tmpDays.Wed,
				tmpDays.Thu,
				tmpDays.Fri,
					tmpDays.Sat,
					tmpDays.Sun
		];
		var i, j;
		for (i=0; i<$scope.days.length; i++) {
			var d = $scope.days[i];
			d.index = i+1;
			for (slot in d.slots){
				var slotData = d.slots[slot];

				// Coalescing users - next block
				var tmp = slot;
				var origSlotChar = slot.charCodeAt(0);
				var nextSlot = String.fromCharCode(origSlotChar+1) + slot.charAt(1);
				while (d.slots[nextSlot] &&
						d.slots[nextSlot].user == slotData.user &&
						d.slots[nextSlot].start == slotData.end) {
					d.slots[nextSlot].start = slotData.start;
					delete d.slots[tmp];
					tmp = nextSlot;
					nextSlot = String.fromCharCode(nextSlot.charCodeAt(0)+1)+slot.charAt(1);
				}

				// Coalescing users - two blocks away
				tmp = slot;
				nextSlot = String.fromCharCode(origSlotChar+2) + slot.charAt(1);
				while (d.slots[nextSlot] &&
						d.slots[nextSlot].user == slotData.user &&
						d.slots[nextSlot].start == slotData.end) {
					d.slots[nextSlot].start = slotData.start;
					delete d.slots[tmp];
					tmp = nextSlot;
					nextSlot = String.fromCharCode(nextSlot.charCodeAt(0)+2)+slot.charAt(1);
				}
			}
		}

		// The default times on the left
		$scope.legend = [];
		var hour;
		var lastHour = data.current.week < data.meta.weeksToReading ? 26 : 28;
		for (hour = 9; hour<lastHour; hour++) {
			$scope.legend.push({start: hour+':00', end: (hour+1)+':00'});
		}
	}

	// Calculates top positioning of a time block given the time
	$scope.timeBlockStyle = function(time) {
		var start, end;
		if (time) {
			var splitStart = time.start.split(':');
			var splitEnd = time.end.split(':');
			start = parseInt(splitStart[0], 10)+(parseInt(splitStart[1], 10)/60.0);
			end = parseInt(splitEnd[0], 10)+(parseInt(splitEnd[1], 10)/60.0);
		}
		else {
			var now = new Date();
			var min = parseInt(now.getMinutes(), 10);
			var hour = parseInt(now.getHours(), 10);
			start = (min/60.0) + hour;
			end = start;
		}

		var height = (end - start) * 48 - 2;
		var topOffset = ((start-9) * 48);
		return {
			'height': ''+height+'px',
			'margin-top': ''+topOffset+'px'
		};
	};

	// Highlights all blocks that are clicked
	$scope.timeBlockClicked = function(user) {
		// Go through all blocks and update selected status
		var oldUser = '';
		var updateSlot = function(slot, id) {
			if (slot.selected) {
				oldUser = slot.user;
			}
			// If the old selected was the same, then deselect
			slot.selected = slot.user == user && oldUser != slot.user;
		};
		for (var i=0; i<$scope.days.length; i++) {
			angular.forEach($scope.days[i].slots, updateSlot);
		}
		$scope.shouldHighlight = oldUser != user; // only when old selected was different
	};


	/* Do all the things! 
	 * 1. Load non-changing data first - meta and perm
	 * 2. Parse the current date
	 * 3. Load the current week
	 * 4. Save to $scope the data for the current week + perm combined
	 */
	var create = function() {
		saveCurrentWeekBounds()
		.then(scheduleLoader.loadWeek)
		.then(visualize, function(error){
			$scope.days = undefined;
			$scope.slots = undefined;
			$scope.shifts = undefined;
			console.log(error);
		});
	};

	// When changed in HTML, will recreate all stuff
	$scope.$watch(function(scope) { 
		return scope.weekOffset; 
	}, create);
	$scope.weekOffset = 0;

});
