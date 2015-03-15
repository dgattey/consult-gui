angular.module('app.views.home', [])
  .controller('FeedCtrl', function($scope, $rootScope){
    // Set title of page
    $rootScope.pageTitle = "Home";

    $scope.links = [
	    {title: 'Schedule', subtitle:'Check your shifts for this week and beyond'}, 
	    {title: 'Sub', subtitle:'Take other people\'s shifts or put your own up for grabs'}, 
	    {title: 'People', subtitle:'Find out who to call if you\'ll be late or are waiting for someone'}
    ];

  });
