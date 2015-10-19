angular.module('app.modules.stateHelper', [])
.provider('stateHelp', function() {
  var prefix = '',      // Prefix for all templateUrl's
    suffix = '.tpl.html', // Suffix for all templateUrl's
    tplNameRegex = '%tpl%', // Replacement string for a tpl name
    sharedViews = {},   // The shared views to use across all states
    stateFunc;        // The function to use in saving state

  // Constructor for current default views
  var getSharedViews = function() {
    var ret = {};
    angular.forEach(sharedViews, function(v,k){
      ret[k] = v;
    });
    return ret;
  };

  // Takes a dictionary of names to partial template names to url fragments
  // and expands it into a full object, adding the prefix and suffix and 
  // replacing any regex'd string for tpl name with the full name
  var expandUrls = function(templates, views) {
    angular.forEach(templates, function(partName, fullName){
      var pref = prefix.replace(tplNameRegex, partName);
      var fullUrl = pref + partName + suffix;
      views[fullName] = {templateUrl: fullUrl};
    });
    return views;
  };

  // Uses the stateFunc to save a state object formatted from expand. stateObj should
  // be an object in form of {name, url, abstract, views}
  var save = function(stateObj) {
    if (!stateFunc) {
      console.error('State helper missing provider\'s save function');
      return;
    }
    stateFunc(stateObj.name, stateObj);
  };

  /** 
   * PUBLIC API
   * Exposes a subset of the functionality for use by others
   */

  // A constant 'regex' to use to replace strings at compile time for template urls
  this.tplNameRegex = tplNameRegex;
  
  // Sets prefix on template urls
  this.setURLPrefix = function(pre) {
    prefix = pre;
  };

  // Sets the shared views on all abstract templates
  this.setSharedViews = function(views) {
    sharedViews = expandUrls(views, {});
  };

  // Expands a basic state object to a $stateProvider formatted one.
  this.expand = function(name, url, templates) {
    if (!templates) {
      templates = {};
    }
    var abstract = templates.views ? true : false;

    // Saves root ui-view to match overall template
    templates[''] = name;

    // Saves the concrete template with .detail appended to name
    if (abstract) {
      save({
        name: name + '.detail',
        url: '',
        views: expandUrls(templates.views, {})
      });
      delete templates.views;
    }

    // Saves the abstract template
    save({
      name: name,
      url: url,
      abstract: abstract,
      views: expandUrls(templates, getSharedViews())
    });
  };

  // Sets the state function to use when saving
  this.setStateFunction = function(func) {
    stateFunc = func;
  };

  // Just returns the whole provider
  this.$get = function(){
    return this;
  };
});