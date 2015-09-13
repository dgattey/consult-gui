angular.module('app.views.content', [])
  .controller('AppCtrl', function($scope, $rootScope) {
		$scope.appName = 'Consult';
		$scope.cslogin = 'dgattey'; //TODO: Load in from login

		// Initializing the search results array with common shortcuts
		$rootScope.searchResults = [
			{state: 'people', title: 'Consultants'},
			{state: 'people', title: 'Head Consultants'},
			{state: 'people', title: 'MTAs'},
			{state: 'people', title: 'SPOC'},
			{state: 'people', title: 'Sunlab'},
			{state: 'schedule', title: 'week'},
			{state: 'schedule', title: 'current'}
		];
});
