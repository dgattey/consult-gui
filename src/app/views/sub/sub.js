angular.module('app.views.sub', [])
	.controller('SubCtrl', function ($scope, $rootScope) {
		$rootScope.pageTitle = 'Sub';
		$scope.headings = [];
	});
