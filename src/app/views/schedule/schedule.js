angular.module('app.views.schedule', ['ui.bootstrap.tooltip','stringExtensions'])
.controller('ScheduleCtrl', function ($scope, $rootScope, $http, StringExtensions, $q, $timeout) {
	var schedLocation = 'assets/schedule/sunlab/sched.';
	var schedLocationMain = 'assets/schedule/sunlab/sched';
	$rootScope.pageTitle = 'Schedule';
	$scope.headings = [];

	// Variables for dates and times, set below
	var meta = {}, // metadata
		current = {}, // info about current week
		slots = {}, // all the slots
		shifts = {}; // shifts to their times

	// Saves raw, newline delimited data to slots
	function saveSlots(raw, location) {
		if (location === undefined) location = slots; //default
		var lines = raw.split('\n');
		var i;
		for (i = 0; i< lines.length; i++) {
			var line = lines[i];
			var spaceIndex = line.indexOf(' ');
			var slot = line.substring(0, spaceIndex).trim();
			var value = line.substring(spaceIndex).trim();
			if (slot === '' || value === '') continue;

			// Free slot?
			if (value.indexOf('FREE') > -1) location[slot] = 'FREE';
			else location[slot] = value; // last version is saved, so if exists twice, whatever
		}
	}

	// Loads in shift times to associate ids with times
	function loadShiftTimes() {
		return $q(function(resolve, reject) {
			$http.get(schedLocation+'shifttimes').success(function(raw) {
				saveSlots(raw, shifts);
				resolve(shifts);					
			}, function(error, data) {
				console.log(error, data);
				reject(error);
			});
		});
	}

	// Loads all the metadata from file to the meta object
	function loadMeta() {
		return $q(function(resolve, reject) {
			$http.get(schedLocation+'meta').success(function(raw) {
				var splits = raw.split(' ');
				meta.startDate = new Date(splits[0]);
				meta.weeks = splits[1];
				meta.weeksToReading = splits[2];
				meta.title = raw.substring(StringExtensions.nthOccurrence(raw, ' ', 3) + 1).trim();
				resolve(meta);
			}, function(error, data) {
				console.log(error, data);
				reject(error);
			});
		});
	}

	// Loads in the current perm schedule to slots
	function loadPerm() {
		return $q(function(resolve, reject) {
			$http.get(schedLocationMain).success(function(raw) {
				saveSlots(raw);
				resolve(slots);
			}, function(error, data) {
				console.log(error, data);
				reject(error);
			});
		});
	}

	// Loads in the current week's schedule to slots - assumes perm is loaded
	function loadWeek() {
		return $q(function(resolve, reject) {
			console.log("Loading week "+ current.week);
			$http.get(schedLocation+'week.'+current.week).success(function(raw) {
				saveSlots(raw);
				resolve(slots);
			}, function(error, data){
				console.log(error, data);
				reject(error);
			});
		});
	}

	// Assumes that loadMeta has already been called - transforms that data
	function parseDate() {
		return $q(function(resolve, reject) {
			var now = new Date();
			saveWeekDateSpan();
			var diff = now.getTime() - meta.startDate.getTime();

			current.week = Math.floor(diff/(3600*24*7*1000)) + $scope.weekOffset; // week number 0-max
			current.day = (now.getDay() + 6) % 7 + 1; //1 -7 like data format
			current.time = now.getHours() + now.getMinutes() / 60.0;

			// Check data and make sure valid
			if (current.week < 0 || current.week > meta.weeks) {
				reject('Error: invalid week requested');
				$scope.days = undefined;
			}
			else resolve(current);
		});
	}

	// Gets the first & last days of the week and saves it
	function saveWeekDateSpan() {

		// Get the Monday
		var startDate = new Date();
		var day = startDate.getDay() || 7;  
		if( day !== 1 ) 
			startDate.setHours(-24 * (day - 1));
		startDate.setHours($scope.weekOffset * 7 * 24);
		$scope.weekStart = startDate;

		// Get the Sunday
		var endDate = new Date();
		day = endDate.getDay() || 7;
		if (day != 7)
			endDate.setHours(24 * (day - 1));
		endDate.setHours($scope.weekOffset * 7 * 24);
		$scope.weekEnd = endDate;
	}

	// Converts '08:20' to 8.33333
	var convertStrDate = function(str) {
		var times = str.split(':');
		return parseInt(times[0]) + parseInt(times[1]) / 60.0;
	};

	// Whether a given slot should show as current
	$scope.showsCurrent = function(day, time) {
		return $scope.weekOffset === 0 && 
			$scope.current.day == day.index &&
			$scope.current.time >= convertStrDate(time.start) && 
			$scope.current.time <= convertStrDate(time.end);
	};

	// Saves data to frontend to visualize
	function visualize() {
		$scope.current = current;
		$scope.shouldHighlight = false;
		tmpDays = {};

		// Associates shift times with days
		for (var slot in shifts) {
			// Only include r and s slots if we're in reading period
			if (slot.indexOf('r') > -1 || slot.indexOf('s') > -1) {
				if (current.week < meta.weeksToReading) continue;
			}

			var val = shifts[slot];
			var dayName = val.substring(0, val.indexOf(' '));
			var startTime = val.substring(StringExtensions.nthOccurrence(val, ' ', 1)+1, val.indexOf('-'));
			var endTime = val.substring(val.indexOf('-')+1);

			var daySlots = tmpDays[dayName] ? tmpDays[dayName].slots : {};
			var free = slots[slot] == 'FREE';
			daySlots[slot] = {
				start: startTime, 
				end: endTime, 
				user: free ? 'Needs sub!' : slots[slot], 
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
				var data = d.slots[slot];

				// Coalescing users - next block
				var tmp = slot;
				var origSlotChar = slot.charCodeAt(0);
				var nextSlot = String.fromCharCode(origSlotChar+1) + slot.charAt(1);
				while (d.slots[nextSlot] && 
						d.slots[nextSlot].user == data.user &&
						d.slots[nextSlot].start == data.end) {
					d.slots[nextSlot].start = data.start;
					delete d.slots[tmp];
					tmp = nextSlot;
					nextSlot = String.fromCharCode(nextSlot.charCodeAt(0)+1)+slot.charAt(1);
				}

				// Coalescing users - two blocks away
				tmp = slot;
				nextSlot = String.fromCharCode(origSlotChar+2) + slot.charAt(1);
				while (d.slots[nextSlot] &&
						d.slots[nextSlot].user == data.user &&
						d.slots[nextSlot].start == data.end) {
					d.slots[nextSlot].start = data.start;
					delete d.slots[tmp];
					tmp = nextSlot;
					nextSlot = String.fromCharCode(nextSlot.charCodeAt(0)+2)+slot.charAt(1);	
				}
			}
		}

		// The default times on the left
		$scope.legend = [];
		var hour;
		var lastHour = current.week < meta.weeksToReading ? 26 : 28;
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
		if (user == 'Needs sub!') return;

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
		$q.all([loadMeta(), loadPerm(), loadShiftTimes()])
			.then(parseDate)
			.then(loadWeek)
			.then(visualize, function(error){
				console.log(error);
			});
	};

	// When changed in HTML, will recreate all stuff
	$scope.$watch(function(scope) { return scope.weekOffset; }, create);

	$scope.weekOffset = 0;
	create();

});
