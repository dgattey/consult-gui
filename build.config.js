/**
 * This file/module contains all configuration for the build process.
 */
module.exports = {
  build: 'build/',
  config: './*.js',
  production: false,

  // JSON config files
  pkg: './package.json',
  bower: './bower.json',

  // File patterns for app code
  app: {
    js: ['src/**/*.js', '!src/assets/**/*.js'],
    assets: ['src/assets/**/*'],
    tpl: ['src/**/*.tpl.html'],
    rootHtml: 'src/index.html',
    sass: ['src/app/**/*.scss'],
    rootSass: 'src/main.scss'
  },

  // Folders to build into
  dest: {
    js: 'js/',
    css: 'css/',
    assets: 'assets/',
    fonts: 'fonts/',
    prefix: 'preview'
  },

  // The minimized versions of files
  min: {
    js: 'app.min.js',
    css: 'app.min.css',
    vendorCSS: 'vendor.css',
    vendorJS: 'vendor.js',
    partials: 'partials.min.js'
  },

  // The files as they exist in the build dir (all globs)
  compiled: {
    js: ['/**/*.js', '!/**/vendor.js'],
    css: ['/**/*.css', '!/**/vendor.css']
  },

  // Vendor code for build process (Angular + Bootstrap + more)
  vendor: {
    src: 'bower_components/',
    js: [
      'angular.min.js',
      'ui-bootstrap.min.js',
      'ui-bootstrap-tpls.min.js',
      'angular-ui-router.min.js',
      'ui-utils.min.js',
      'angular-sanitize.min.js'
    ],
    map:[
      'angular-sanitize.min.js.map',
      'angular.min.js.map'
    ],
    css: [
      'bootstrap/dist/css/bootstrap.min.css'
    ],
    fonts: [
    ]
  }
};
