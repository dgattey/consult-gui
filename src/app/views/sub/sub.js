angular.module('app.views.sub', [])
.controller('SubCtrl', function ($scope, $rootScope, scheduleLoader) {
	$rootScope.pageTitle = 'Sub';

	// Helper to convert string time to decimal rep: i.e. '08:20' -> 8.33333
	// function timeToDecimal(str) {
	// 	var times = str.split(':');
	// 	return parseInt(times[0], 10) + parseInt(times[1], 10) / 60.0;
	// }

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

	// weekStart is date, dayNum is 1-7 for day after
	$scope.calculateDate = function(weekStart, dayNum) {
		var date = new Date(weekStart);
		var diff = date.getDate() + parseInt(dayNum);
		console.log(diff);
		date.setDate(diff);
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
		var minWeek = 1;
		var maxWeek = data.meta.weeks;

		// Initializing the frontend data
		$scope.freeSlots = {};

		// TODO: only load from current week to end
		// TODO: make loadFree not load metadata somehow
		for (i = minWeek; i <= maxWeek; i++) {
			scheduleLoader.loadFree(i)
			.then(saveWeek);
		}
	}

	// Needs to initialize all shifts for the metadata, then loads each
	// week's free slots
	scheduleLoader.initializeShifts()
	.then(loadAllWeeks);

	
});
