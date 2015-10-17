angular.module('app.views.schedule', ['ui.bootstrap.tooltip', 'stringExtensions'])
.controller('ScheduleCtrl', function ($scope, $rootScope, $http, $q, $timeout, scheduleLoader, StringExtensions) {
	$rootScope.pageTitle = 'Schedule';

	// Helper to convert string time to decimal rep: i.e. '08:20' -> 8.33333
	function timeToDecimal(str) {
		var times = str.split(':');
		return parseInt(times[0], 10) + parseInt(times[1], 10) / 60.0;
	}

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

	/*
	 * Given the data, creates days, blocks, and ordered slots that represent
	 * all the blocks each day that can be visualized
	 */
	function visualize(data) {
		// Save metadata to $scope for use later
		$scope.maxWeeks = data.meta.weeks;
		$scope.current = data.current;
		$scope.shouldHighlight = false;
		
		// Generate the days array with slots associated with times
		$scope.days = scheduleLoader.slotsToDays(data);

		// Setup the default times for the legend on the left
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
		console.log(error);
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
