angular.module('app.views.home', [])
  .controller('FeedCtrl', function($scope, $rootScope){
    // Set title of page
    $rootScope.pageTitle = "Home";

    $scope.options = [
    	{title: 'Schedule', text: 'Check your assigned shifts'},
    	{title: 'Sub', text: 'Sub out shifts or take other\'s subbed shifts'},
    	{title: 'People', text: 'See contact information for all consultants'}
    ];

  });
