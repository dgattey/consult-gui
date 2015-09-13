angular.module('app.views.people', ['phoneFilter'])
	.controller('PeopleCtrl', function ($http, $scope, $rootScope) {
		var phonebookLoc = 'assets/people/current-phonebook';
		$rootScope.pageTitle = 'People';
		$scope.headings = [];
		
		// Takes raw data and converts it to real data
		function parseData(raw) {
			var lines = raw.split('\n');
			var person = /(.*)\s(\d{3}-\d{3}-\d{4})/; // line with phone number at end
			var heading = {people: []}; // the current heading object	
			var consultants;

			// Go through each line, and if heading, save the last and reset, and if person, add to heading
			var index, len;
			for (index = 0, len = lines.length; index < len; ++index) {
				var line = lines[index].trim();
				
				// Was person
				if (person.test(line)) {
					var m = person.exec(line);
					heading.people.push({name: m[1].trim(), phone: m[2]});

					// TODO: Do in global scope - may need to refactor this code to module
					// Add name to search results
					$rootScope.searchResults.push({
						title: m[1].trim(),
						state: 'people'
					});
				}

				// End of a heading
				else if (line.trim().length === 0 && heading.name && heading.name.length > 0) {
					if (heading.name == 'Consultants')
						consultants = heading;
					else $scope.headings.push(heading);
					heading = {people:[]};
				}

				// A heading itself
				else if (line.charAt(0) != '-' && 
						line.charAt(line.length-1) != '>') {
					heading.name = line.trim();
				}
			}
			if (heading.name && heading.name.length>0) $scope.headings.push(heading);
			if (consultants) $scope.headings.unshift(consultants);
		}

		// Load the phonebook
		$http.get(phonebookLoc).success(function(raw) { 
			parseData(raw);
		}, function(error, data){
			console.log(error, data);
		});
	});
