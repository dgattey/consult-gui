angular.module('App', [
  //vendor
  'ui.bootstrap',
  'ui.router',
  'ngSanitize',

  //app
  'app.partials', //templates
  'app.modules',
  'app.models',
  'app.views'
  ])
.config(function($urlRouterProvider, $locationProvider, stateHelpProvider){
    var shpc = stateHelpProvider.configDefaultPage;

    // Set up ui-router states using the stateHelpProvider library
    shpc('home', '');

    // Configure other router providers
    $urlRouterProvider.otherwise('/');
    $locationProvider.html5Mode(false);
  });