angular.module('app.modules.scheduleLoader', ['stringExtensions'])
.service('scheduleLoader', function($q, $http, StringExtensions) {
  // Location where the schedule assets are held, relative to top level directory
  var schedDir = 'assets/schedule/sunlab/sched';

  /*
   * Saves raw, newline delimited slot data to dest. Data appears in (id, info) 
   * pairs, where the id is a letter (time slot) and number (day of week, 1 indexed).
   * The info is either a <login>, CLOSED, FREE <login> (that person put it up 
   * for subs), or a date and time describing what that slot is.
   * Examples: 
   *
   * b1 artran
   * d5 CLOSED
   * f5 FREE awstlaur
   * j2 Tue 18:00-19:00
   */
  function saveRawSlotData(raw, dest) {
    var lines = raw.split('\n');
    var i;
    for (i = 0; i< lines.length; i++) {
      var line = lines[i];
      var space = line.indexOf(' ');
      var slot = line.substring(0, space).trim();
      var login = line.substring(space).trim();
      if (slot === '' || login === '') continue;

      // Does FREE exist in "login"? If so, it's a free slot
      if (login.indexOf('FREE') > -1) dest[slot] = 'FREE';
      else dest[slot] = login; // overwrites prior - files organized by recency
    }
  }

  /*
   * Given a slot, parses shift time and date and saves the user, start/end,
   * and free data to the days array. See saveRawSlotData for details about
   * the id.
   */
  function saveSlotToDays(id, days, data) {
    // Parse text data from shifts
    var text = data.shifts[id];
    var dayName = text.substring(0, text.indexOf(' '));
    var startTime = text.substring(StringExtensions.nthOccurrence(text, ' ', 1)+1, text.indexOf('-'));
    var endTime = text.substring(text.indexOf('-')+1);
    
    // Update slots and title
    i = id.substring(1, 2) - 1; //since it's 1 indexed
    if (!days[i]) {
      days[i] = {title: '', slots: {}, index: i+1};
    }
    days[i].slots[id] = {
      start: startTime,
      end: endTime,
      user: data.slots[id],
      free: data.slots[id] == 'FREE',
      selected: false
    };
    days[i].title = dayName;
  }

  /*
   * Saves metadata to dest. Metadata simply appears as startdate of semester, number 
   * of weeks in the semester, the number of weeks until reading period, and finally 
   * a local title for the current semester (unused)
   */
  function saveMetaData(raw, dest) {
    var meta = raw.split(' ');
    dest.startDate = new Date(meta[0]);
    dest.weeks = meta[1];
    dest.weeksToReading = meta[2];
  }

  /*
   * Generic function for loading from a file and saving slot information to dest
   * and returning a promise to wrap it all up.
   * 
   * data: object representing data passed through all functions
   * dest: where to save the slot data to
   * file: location in filesystem to load
   * func: the function to use to save the data (if not specified, uses saveRawSlotData)
   */
  function saveFromFile(data, dest, file, func) {
    var loc = file ? schedDir + file : schedDir;
    return $q(function(resolve, reject) {
      $http.get(loc).success(function(raw) {
        if (!func) {
          func = saveRawSlotData;
        }
        func(raw, dest);
        resolve(data);
      }, function(error, data) {
        console.log(error, data);
        reject(error);
      });
    });
  }

  // Loads all the metadata from file to the meta object
  function readMetadata(data) {
    return saveFromFile(data, data.meta, '.meta', saveMetaData);
  }

  // Loads in translation of id -> shift times to data.shifts
  function translateShifts(data) {
    return saveFromFile(data, data.shifts, '.shifttimes');
  }

  // Loads in the permanent schedule to data.slots
  function readPermanentSchedule(data) {
    return saveFromFile(data, data.slots);
  }

  // Loads in the current (or specifed) week's schedule to data.slots
  function readWeekSchedule(data, weekNum) {
    return saveFromFile(data, data.slots, '.week.' + (weekNum ? weekNum : data.current.week));
  }

  /*
   * Uses the metadata and week offset to calculate the current week, day, and time for 
   * data. Will reject the promise if the week is invalid.
   */
  function setCurrent(data, weekOffset) {
    if (!weekOffset) weekOffset = 0;
    return $q(function(resolve, reject) {
      var now = new Date();
      var diff = now.getTime() - data.meta.startDate.getTime();

      data.current.week = Math.floor(diff/(3600*24*7*1000)) + weekOffset; // week number 0-max
      data.current.day = (now.getDay() + 6) % 7 + 1; //1 -7 like data format
      data.current.time = now.getHours() + now.getMinutes() / 60.0;

      // Check data and make sure valid
      if (data.current.week < 0 || data.current.week > data.meta.weeks) {
        reject('Error: invalid week requested');
      }
      else resolve(data);
    });
  }

  /*
   * Gets the next slot from the current slot text. Slots are represented
   * represented as letter + number, where the letter is an hour of the day
   * and day is a day of the week (1 through 7).
   */
  function nextSlot(slot) {
    var hour = slot.charCodeAt(0);
    var day = slot.charCodeAt(1);
    return String.fromCharCode(hour + 1, day);
  }

  /*
   * Takes each slot and coalesces it with the one next to it if
   * the username matches. Does it once for the next block, then 
   * repeats for blocks two away, guaranteeing combination for all
   * blocks.
   */
  function coalesceSlots(days) {
    for (var i in days) {
      var d = days[i];

      // For each slot, if it is the same user as the next one and
      // the times for start and end match, then combine them into one
      for (var idCurr in d.slots){
        var idNext = nextSlot(idCurr);
        var curr = d.slots[idCurr];
        var next = d.slots[idNext];
        while (next && next.user == curr.user && next.start == curr.end) {
          next.start = curr.start;
          delete d.slots[idCurr];
          idCurr = idNext;
          idNext = nextSlot(idNext);
        }
      }
    }
  }

  /*
   * Sets up the data object, and reads in metadata and shifttimes to the
   * array. Sets up the object for future calls to load in files
   */
  function initializeShifts(meta, shifts, current) {
    var data = {
      meta: meta ? meta: {},
      shifts: shifts ? shifts : {},
      current: current ? current : {},
      slots: {}
    };
    var noopPromise = $q(function(resolve, reject){
      resolve(data);
    });
    return (meta ? noopPromise : readMetadata(data))
    .then(shifts ? noopPromise : translateShifts)
    .then(current ? noopPromise : setCurrent);
  }

  /*
   * Given a data array, filters out all slots that don't have a user
   * equal to the passed in value
   */
   function filter(data, user) {
    if (!user) user = 'FREE'; // default
    return $q(function(resolve, reject) {
      if (!data.slots) {
        reject('No slot data');
      }
      for (var slot in data.slots) {
        if (data.slots[slot] == user) continue;
        else delete data.slots[slot];
      }
      resolve(data);
    });
  }

  /* PUBLIC 
   * Methods exposed to any users of this module
   */

  this.initializeShifts = initializeShifts;
  this.filter = filter;

  /*
   * Loads in metadata, the translation of id -> shift times, the permanent
   * schedule, the current week's schedule based on weekOffset, and returns
   * the data via promise
   */
  this.loadWeek = function(weekOffset, meta, shifts, current) {
    return initializeShifts(meta, shifts, current)
    .then(readPermanentSchedule)
    .then(function(data) {
      return setCurrent(data, weekOffset);
    })
    .then(readWeekSchedule);
  };

  /*
   * Loads the current week's schedule based on offset (but not the 
   * perm schedule), deletes all non-free spots, and returns the data 
   * via promise. 
   */
  this.loadFree = function(weekOffset, meta, shifts, current) {
    return initializeShifts(meta, shifts, current)
    .then(function(data) {
      return setCurrent(data, weekOffset);
    })
    .then(readWeekSchedule)
    .then(filter);
  };

  /*
   * Saves each shift to a slot in the days array and sets up 
   * data for selected, free, etc. for each slot. At end, we
   * will have a 0-6 days array, with an object for title, slots,
   * and index for each. Also coalesces adjacent slots so users
   * have long blocks rather than hour long blocks.
   */
  this.slotsToDays = function(data) {
    // Initializing days object
    days = {};

    for (var id in data.shifts) {
      // r & s are reading period only, and lack of data slot means it shouldn't be saved
      if ((id.indexOf('r') > -1 || id.indexOf('s') > -1) && data.current.week < data.meta.weeksToReading) continue;
      if (!data.slots[id]) continue;
      saveSlotToDays(id, days, data);
    }

    // Combine adjacent slots that are the same user and return days
    coalesceSlots(days);
    if (Object.keys(days).length === 0) return undefined;
    return days;
  };
});
