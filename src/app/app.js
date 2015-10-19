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
.config(function($urlRouterProvider, $locationProvider, $stateProvider, stateHelpProvider){
    // Set up defaults for state helper
    stateHelpProvider.setStateFunction($stateProvider.state);
    stateHelpProvider.setURLPrefix('app/views/'+stateHelpProvider.tplNameRegex+'/');
    stateHelpProvider.setSharedViews({
        header: 'header',
        footer: 'footer'
    });

    // Expand states and save them with the $stateProvider
    stateHelpProvider.expand('home', '/');
    stateHelpProvider.expand('schedule', '/schedule/:weekOffset');
    stateHelpProvider.expand('sub', '/sub');
    stateHelpProvider.expand('people', '/contact');

    // Configure other router providers
    $urlRouterProvider.otherwise('/');
    $locationProvider.html5Mode(false);
  });
