angular.module('app.modules.scheduleLoader', ['stringExtensions'])
.service('scheduleLoader', function($q, $http, StringExtensions) {
  // Location where the schedule assets are held, relative to top level directory
  var fileLoc = 'assets/schedule/sunlab/sched';

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
  function saveSlotData(raw, dest) {
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
   * file: location in filesystem to load
   * dest: where to save the slot data to
   * func: the function to use to save the data (if not specified, uses saveSlotData)
   */
  function saveFromFile(data, file, dest, func) {
    return $q(function(resolve, reject) {
      $http.get(file).success(function(raw) {
        if (!func) {
          func = saveSlotData;
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
    return saveFromFile(data, fileLoc + '.meta', data.meta, saveMetaData);
  }

  // Loads in translation of id -> shift times to data.shifts
  function translateShifts(data) {
    return saveFromFile(data, fileLoc + '.shifttimes', data.shifts);
  }

  // Loads in the permanent schedule to data.slots
  function readPermanentSchedule(data) {
    return saveFromFile(data, fileLoc, data.slots);
  }

  // Loads in the current week's schedule to data.slots
  function readWeekSchedule(data) {
    return saveFromFile(data, fileLoc + '.week.' + data.current.week, data.slots);
  }

  /*
   * Uses the metadata and week offset to calculate the current week, day, and time for 
   * data. Will reject the promise if the week is invalid.
   */
  function setCurrent(data, weekOffset) {
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
   * PUBLIC FUNCTION
   * Loads in metadata, the translation of id -> shift times, the permanent
   * schedule, the current week's schedule based on weekOffset, and 
   */
  this.loadWeek = function(weekOffset) {
    var data = {meta: {}, slots: {}, shifts: {}, current: {}};
    return readMetadata(data)
    .then(translateShifts)
    .then(readPermanentSchedule)
    .then(function(data) {
      return setCurrent(data, weekOffset);
    })
    .then(readWeekSchedule);
  };
});
