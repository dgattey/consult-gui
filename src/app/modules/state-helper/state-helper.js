angular.module('app.modules.stateHelper', [])
.provider('stateHelp', function($stateProvider) {
    var genericTPL = 'content';

    // Utility to associate a partial or nonexistent template url with the actual file
    var processTemplateURL = function(item) {
      var part = item.partURL ? item.partURL : item.id;
      return {templateUrl : 'app/views/'+part+'/'+part+'.tpl.html'};
    };

    // Given a parent view, creates @absolute views from children
    var createStateViews = function(parent) {
      var subviews = {};
      angular.forEach(parent.views, function(item){
        subviews[item.id+'@'+parent.id] = processTemplateURL(item);
      });
      subviews[''] = processTemplateURL(parent);
      return subviews;
    };

    /* Given a nested object with configuration params, creates the $state router
       - Takes one level of subviews and creates absolute links for them
       - Sets id based off id or if default '/'
       - Sets up $stateProvider.state with all this information
       */
    var configState = function(item) {
      var subviews = createStateViews(item);
      var url = item['default'] ? '/' : '/'+item.url;
      var obj = { url: url, views: subviews };
      $stateProvider.state(item.id, obj);

      obj.id = item.id;
      return obj;
    };

    /* Configures the default navigation for any page with header, footer, content
       - Assumes the views/home/home.tpl.html holds the page template
       - Assumes home has ui-views named header, content, and footer
       - Configures content to work with the correct subviews
       - ID is the high level id and location of template on disk
       - URL is the actual path URL
       - extra is extra views (array or object)
       - If def is true, configures '/' instead of url as the url
       */
    this.configDefaultPage = function(id, url, extra, def) {
      // Deals with missing url (assumes id mandatory)
      if (url.id || url[0] && url[0].id) {
        def = extra;
        extra = url;
        url = id;
      }

      var page = { id: id, partURL: 'content'};
      page.url = url;
      if (def === true) page['default'] = true; // default?

      // Content template
      var content = { id: genericTPL };
      content.partURL = id; // Custom URL

      // Creates views (with extra data if need be)
      var views = [content, {id : 'header'}, {id : 'footer'}];
      if (extra) {
        if (extra.concat) views = views.concat(extra);
        else views.push(extra);
      }
      page.views = views;

      return configState(page);
    };

    // Nothin
    this.$get = function() {
      return angular.noop;
    };
});
