/**
 * This file/module contains all configuration for the build process.
 */
module.exports = {
  /**
   * The `buildDir` folder is where our projects are compiled during
   * development and the `distDir` folder is where our app resides once it's
   * completely built. `vendorDir` is the place where all vendor files reside.
   * `server' is the location of the server
   */
  buildDir: 'build/',
  distDir: 'dist/',
  vendorDir: 'bower_components/',
  server: '',


  /**
   * This is a collection of file patterns that refer to our app code (the
   * stuff in `src/`). These file paths are used in the configuration of
   * build tasks. `js` is all project javascript, sass tests. `tpl` contains
   * our template HTML files. `html` is just our main HTML file, `sass` is
   * our main stylesheet.
   */
  appFiles: {
    js: [ 'src/**/*.js', '!src/**/*.spec.js', '!src/assets/**/*.js' ],
    assets: [ 'src/assets/**/*.*', 'src/assets/**/*' ],
    tpl: [ 'src/app/**/*.tpl.html', 'src/common/**/*.tpl.html' ],
    rootHtml: 'src/index.html',
    sass: [ 'src/**/*.scss' ],
    rootSass: 'src/main.scss'
  },

  /**
   * This is a collection of folders used for building of the app
   */
  destDirs: {
    js: 'js/',
    css: 'css/',
    vendor: 'vendor/',
    assets: 'assets/',
    vendor: 'vendor/'
  },

  /**
   * This is the same as `appFiles`, except it contains patterns that
   * reference vendor code (`vendor/`) that we need to place into the build
   * process somewhere. While the `appFiles` property ensures all
   * standardized files are collected for compilation, it is the user's job
   * to ensure non-standardized (i.e. vendor-related) files are handled
   * appropriately in `vendorFiles.js`.
   */
  vendorFiles: {
    js: [
      'angular/angular.min.js',
      'angular-bootstrap/ui-bootstrap.min.js',
      'angular-bootstrap/ui-bootstrap-tpls.min.js',
      'angular-ui-router/release/angular-ui-router.min.js',
      'angular-ui-utils/ui-utils.min.js',
      'angular-sanitize/angular-sanitize.min.js'
    ],
    map:[
      'angular/angular.min.js.map',
      'angular-sanitize/angular-sanitize.min.js.map'
    ],
    css:[
      'bootstrap/dist/css/bootstrap.min.css'
    ]
  },

  packageJSON: [
    './package.json',
    './bower.json'
  ]
};
