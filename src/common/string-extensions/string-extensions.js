angular.module('stringExtensions', [])
.factory('StringExtensions', function() {
	var StrExten = {};

	// Trims whitespace, turns it to lowercase, and changes special characters to dashes
	StrExten.hrefify = function(string) {
		if (!string) return "";
		return string.trim()
             .toLowerCase()
             .replace(/[\/. ,:-]+/g, "-");
	};

	// Returns if a string starts with looking
	StrExten.startsWith = function(string, looking){
		return string.lastIndexOf(looking, 0) === 0;
	};

	// Gets last dash component (issue-name-id returns id alone)
	StrExten.lastDashComponent = function(string) {
		var array = string.split('-');
		if (array.length === 0) return "";
		if (array.length === 1) return array[0];
		return array[array.length-1];
	};

	// Removes character
	StrExten.removeChar = function(string, char) {
		var reg = new RegExp(char, "g");
		return string.replace(reg,'');
	};

	return StrExten;
});