angular.module('app.views.home', [])
  .controller('FeedCtrl', function($scope, $rootScope){
    // Set title of page
    $rootScope.pageTitle = "Home";
  });
