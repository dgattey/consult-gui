angular.module('app.views.header', [])
  .controller('HeaderCtrl', function($scope){
  	$scope.isCollapsed = true;

  	$scope.navigation = [
  		{ state:'home', title: 'Home' },
  		{ state:'about', title: 'About' },
  		{ state:'portfolio', title: 'Portfolio' },
  		{ state:'contact', title: 'Contact' }
  	];
  });
