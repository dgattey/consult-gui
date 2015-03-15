angular.module('app.views.schedule', [])
	.controller('ScheduleCtrl', function ($scope, $rootScope) {
		$rootScope.pageTitle = 'Schedule';
		$scope.headings = [];
	});
