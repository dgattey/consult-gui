angular.module('app.views.header', [])
  .controller('HeaderCtrl', function($scope){
  	$scope.isCollapsed = true;

  	$scope.navigation = [
  		{ state:'home', title: 'Home' },
  		{ state:'schedule', title: 'Schedule' },
  		{ state:'sub', title: 'Sub' },
  		{ state:'contact', title: 'People' }
  	];
  });
