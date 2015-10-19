angular.module('app.views.sub', [])
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

	// weekStart is date, dayOffset is 1-7 for day after
	$scope.calculateDate = function(weekStart, dayOffset) {
		var date = new Date(weekStart);
		var day = date.getDate() + parseInt(dayOffset, 10);
		date.setDate(day);
		return date;
	};

	function saveWeek(data) {
		if (Object.keys(data.slots).length === 0) return;

		// Save current week to the free slots array
		var days = scheduleLoader.slotsToDays(data);
		monday = calculateMonday(data.meta.startDate, data.current.week);
		$scope.freeSlots[data.current.week] = {date: monday, days:days};
	}

	function loadAllWeeks(data) {
		var minWeek = 0;
		var maxWeek = data.meta.weeks - data.current.week;

		// Initializing the frontend data
		$scope.freeSlots = {};
		for (i = minWeek; i <= maxWeek; i++) {
			scheduleLoader.loadFree(i, data.meta, data.shifts)
			.then(saveWeek);
		}
	}

	// Needs to initialize all shifts for the metadata, then loads each
	// week's free slots
	scheduleLoader.initializeShifts()
	.then(loadAllWeeks);

	
});
