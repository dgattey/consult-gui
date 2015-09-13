angular.module('app.views.header', [])
  .controller('HeaderCtrl', function($scope, $rootScope){
		$scope.isCollapsed = true;
		
		$scope.navigation = [
			{ state:'home', title: 'Home' },
			{ state:'schedule', title: 'Schedule' },
			{ state:'sub', title: 'Sub' },
			{ state:'people', title: 'People' }
		];

	$rootScope.searchResults = $rootScope.searchResults.concat($scope.navigation);
  });
