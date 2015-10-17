angular.module('app.views.schedule', ['ui.bootstrap.tooltip', 'stringExtensions'])
.controller('ScheduleCtrl', function ($scope, $rootScope, $http, $q, $timeout, scheduleLoader, StringExtensions) {
	$rootScope.pageTitle = 'Schedule';

	/*
	 * Helper to save the bounds of the current week. From current day and week
	 * offset, calculates the week's start and end as dates and saves them to 
	 * $scope. Start is Monday, end is Sunday.
	 */
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

	// Helper to convert string time to decimal rep: i.e. '08:20' -> 8.33333
	function timeToDecimal(str) {
		var times = str.split(':');
		return parseInt(times[0], 10) + parseInt(times[1], 10) / 60.0;
	}

	/*
	 * Saves each shift to a slot in the $scope.days array and sets up 
	 * data for selected, free, etc.
	 */
	function saveShiftsToDays(data) {
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
			daySlots[slot] = {
				start: startTime,
				end: endTime,
				user: data.slots[slot],
				free: data.slots[slot] == 'FREE',
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
	}

	/*
	 * Takes each slot and coalesces it with the one next to it if
	 * the username matches. Does it once for the next block, then 
	 * repeats for blocks two away, guaranteeing combination for all
	 * blocks.
	 */
	function coalesceSlots(data) {
		var i, j;
		for (i=0; i<$scope.days.length; i++) {
			var d = $scope.days[i];
			d.index = i+1;
			for (var slot in d.slots){
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
	}

	/*
	 * Given the data, creates days, blocks, and ordered slots that represent
	 * all the blocks each day that can be visualized
	 */
	function visualize(data) {
		// Save data to $scope for use later
		$scope.maxWeeks = data.meta.weeks;
		$scope.current = data.current;
		$scope.shouldHighlight = false;
		
		// Save the shifts and coalesce the slots to consolidate it
		saveShiftsToDays(data);
		coalesceSlots(data);

		// Setup the default times on the left via array
		$scope.legend = [];
		var hour;
		var lastHour = data.current.week < data.meta.weeksToReading ? 26 : 28;
		for (hour = 9; hour<lastHour; hour++) {
			$scope.legend.push({start: hour+':00', end: (hour+1)+':00'});
		}
	}

	/*
	 * Determines whether a given slot should show as current. This means
	 * the current time intersects it (start and end within bounds)
	 */
	function shouldShowSlotCurrent(day, time) {
		return $scope.weekOffset === 0 &&
			$scope.current.day == day.index &&
			$scope.current.time >= timeToDecimal(time.start) &&
			$scope.current.time <= timeToDecimal(time.end);
	}

	/*
	 * Determines whether a given slot should show as disabled. This is
	 * calculated by checking whether the slot is in the past.
	 */
	function shouldShowSlotDisabled(day, time) {
		// This week, so either day is less than current, or end time is before now
		if ($scope.weekOffset === 0) {
			var curr = $scope.current;
			var blockEndsBeforeNow = curr.time > timeToDecimal(time.end) && curr.day == day.index;
			return $scope.current.day > day.index || blockEndsBeforeNow;
		}
		// Prior week?
		return $scope.weekOffset < 0;
	}

	/*
	 * Used to calculate height and top margin for a given time block.
	 * All values used to calculate are unfortunately magic numbers 
	 * that have been chosen to make it look right. 48 and 9 have no 
	 * numerical signficance other than the fact that they look right.
	 */
	function calculateBlockStyle(time) {
		var start, end;
		if (time) {
			start = timeToDecimal(time.start);
			end = timeToDecimal(time.end);
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
	}

	/*
	 * Highlights all blocks that belong to a user in response to 
	 * a click on a given block. Also used to unhighlight if
	 * clicked again.
	 */
	function highlight(user) {
		var oldUser = '';
		var updateSlot = function(slot, id) {
			if (slot.selected) {
				oldUser = slot.user;
			}
			// If the old selected was the same, then deselect
			slot.selected = slot.user == user && oldUser != slot.user;
		};
		// Go through all blocks and update selected status
		for (var i=0; i<$scope.days.length; i++) {
			angular.forEach($scope.days[i].slots, updateSlot);
		}
		$scope.shouldHighlight = oldUser != user; // only when old selected was different
	}

	/*
	 * Handles visualization errors by deleting $scoped data and
	 * printing the error for the user
	 */
	function errorHandler(error) {
		$scope.days = undefined;
		$scope.slots = undefined;
		$scope.shifts = undefined;
		console.error(error);
	}

	/*
	 * Exposes functions to $scope that are previously defined. Also
	 * sets up constants for the frontend.
	 */
	$scope.weekOffset = 0;
	$scope.headings = [];
	$scope.showsCurrent = shouldShowSlotCurrent;
	$scope.showsPast = shouldShowSlotDisabled;
	$scope.blockStyle = calculateBlockStyle;
	$scope.highlight = highlight;

	/*
	 * When week offset changes, save the bounds, load the 
	 * week in via scheduleLoader, and visualize it
	 */
	$scope.$watch(function(scope) {
		return scope.weekOffset;
	}, function() {
		saveCurrentWeekBounds()
		.then(scheduleLoader.loadWeek)
		.then(visualize, errorHandler);
	});

});
