angular.module('app.views.sub', [])
.filter('free', function($rootScope) {
	return function(shifts) {
		for (var id in shifts) {
			if (!shifts[id].free && shifts[id].user != $rootScope.cslogin) delete shifts[id];
		}
		return shifts;
	};
})
.controller('SubCtrl', function ($scope, $rootScope, scheduleLoader) {
	$rootScope.pageTitle = 'Sub';

	/*
	 * Helper to save the bounds of the current week. From current day and week
	 * offset, calculates the week's start and end as dates and saves them to 
	 * $scope. Start is Monday, end is Sunday.
	 */
	function calculateMonday(original, weekOffset) {
		var date = new Date(original),
			day = date.getDay(),
			diffToMonday = date.getDate() - day + (day === 0 ? -6 : 1);

		// Get the Monday of the week
		date.setDate(diffToMonday);
		date.setHours(weekOffset * 7 * 24); // move it by x weeks
		return date;
	}

	/*
	 * Helper to calculate a date given a date representing the start of the week
	 * and an offset for the number of days after it that we should be showing
	 */
	function calculateDate(weekStart, dayOffset) {
		var date = new Date(weekStart);
		var day = date.getDate() + parseInt(dayOffset, 10);
		date.setDate(day);
		return date;
	}

	/*
	 * Given one week's worth of data, saves it to the slots
	 * array. Means that each time we load a week, the slots array gets
	 * changed. Oh well.
	 */
	function saveWeek(data) {
		// Keep a count of the free and me slots for this week
		var freeCount = 0;
		var meCount = 0;
		for (var slot in data.slots) {
			if (data.slots[slot] == 'FREE') freeCount++;
			if (data.slots[slot] == $rootScope.cslogin) meCount++;
		}

		// Save the days object
		var days = scheduleLoader.slotsToDays(data);
		weekStart = calculateMonday(data.meta.startDate, data.current.week);
		$scope.slots[data.current.week] = {date:weekStart, days:days, free:freeCount, me:meCount};
	}

	/*
	 * Function to loop through all weeks from today and use promises to 
	 * asyncronously load and save the given week. The loader uses the
	 * current date automatically, so we just need to iterate to total
	 * weeks - current week offset.
	 */
	function loadAllWeeks(data) {
		var minWeek = 0;
		var maxWeek = data.meta.weeks - data.current.week;
		for (i = minWeek; i <= maxWeek; i++) {
			var perm = angular.fromJson(angular.toJson(data.slots, true));
			scheduleLoader.loadWeek(i, data.meta, data.shifts, perm)
			.then(saveWeek);
		}
	}

	$scope.freeCount = function(slots) {
		var count = 0;
		for (var id in slots) {
			count += slots[id].free;
		}
		return count;
	}

	$scope.meCount = function(slots) {
		var count = 0;
		for (var id in slots) {
			count += slots[id].me;
		}
		return count;
	}

	/*
	 * Creates metadata and shift times once, then repeatedly loads in
	 * each week's worth of data. There's only one data source, but it's
	 * filtered on the frontend to only show free slots or only show own
	 * slots.
	 */
	$scope.slots = {};
	$scope.calculateDate = calculateDate;
	scheduleLoader.initializeShifts()
	.then(loadAllWeeks);

	
});
