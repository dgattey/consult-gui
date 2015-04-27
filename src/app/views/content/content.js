angular.module('app.views.content', [])
  .controller('AppCtrl', function($scope) {
  	$scope.appName = 'Consult';
		$scope.cslogin = 'dgattey'; // TODO: Load in from login
});
