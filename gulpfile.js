// gulp
var gulp        = require('gulp');

// gulp extensions
var gutil       = require('gulp-util'),
    sass        = require('gulp-sass'),
    inject      = require('gulp-inject'),
    multinject  = require('gulp-multinject'),
    watch       = require('gulp-watch'),
    filter      = require('gulp-filter'),
    ngHtml2Js   = require('gulp-ng-html2js'),
    replacer    = require('gulp-replace'),

    //test
    jshint      = require('gulp-jshint'),
    stylish     = require('jshint-stylish'),

    //optimize
    csso        = require('gulp-csso'),
    uglify      = require('gulp-uglify'),
    ngmin       = require('ng-annotate'),
    concat      = require('gulp-concat'),
    jsonminify  = require('gulp-jsonminify')

    //utilities
    psTree      = require('ps-tree'),
    rimraf      = require('rimraf'),
    mergeStream = require('merge-stream'),

    //package
    bump        = require('gulp-bump'),
    semver      = require('semver'),
    fs          = require('fs'),
    sftp        = require("gulp-sftp"),

    // development server
    connect     = require('gulp-connect');

/**
 * Load in our build configuration file.
 */
var cfg = require( './build.config.js' );
var pjson = require( cfg.packageJSON[0] );
var jshintOptions = {
  predef: ['angular'],
  browser: true
};

function prefixVendor(globArray, notFinal) {
  var dir = notFinal ? cfg.vendorDir : cfg.destDirs.vendor;
  var prefix = function(a){return dir + "**/" + a};
  return globArray.map(prefix);
}

// --- Streaming DEV/DIST Functions ---
function copyVendor(){

  var vendorJS = gulp.src( prefixVendor(cfg.vendorFiles.js, true) );
  var vendorMap = gulp.src( prefixVendor(cfg.vendorFiles.map, true) );
  var vendorCSS = gulp.src( prefixVendor(cfg.vendorFiles.css, true) );

  var allVendor = mergeStream(vendorJS, vendorMap);
  allVendor = mergeStream(allVendor, vendorCSS);

  return allVendor
    .pipe( gulp.dest( cfg.destDirs.vendor ) );
}

function sassDev(){
  var vCss = gulp.src( prefixVendor(cfg.vendorFiles.css) );
  var appCss = gulp.src( cfg.appFiles.rootSass )

  var allCss = mergeStream(vCss, appCss)
    .pipe( sass({ errLogToConsole: true }));

  return allCss
    .pipe( gulp.dest( cfg.buildDir+cfg.destDirs.css  ) )
    .pipe( connect.reload() );
}
function sassDist(){
  var vCss = gulp.src( prefixVendor(cfg.vendorFiles.css) );

  var appCss = gulp.src( cfg.appFiles.rootSass )
    .pipe( sass({ errLogToConsole: false, style: 'compressed' }))
    .pipe( csso() );

  return mergeStream(vCss, appCss)
    .pipe( concat('app.min.css') )
    .pipe( gulp.dest( cfg.distDir+cfg.destDirs.css  ) );
}

function jsDev(files){
  return files
    .pipe( jshint( jshintOptions ) )
    .pipe( jshint.reporter( stylish ) )
    .pipe( gulp.dest( cfg.buildDir+cfg.destDirs.js  ) )
    .pipe( connect.reload() );
}
function jsDist(files){
  return files
    .pipe(replacer("html5Mode(false)", function() {
      return "html5Mode(true)";
    }))
    .pipe( jshint( jshintOptions ) )
    .pipe( jshint.reporter( stylish ) )
    .pipe( ngmin() )
    .pipe( uglify() )
    .pipe( concat('app.min.js') )
    .pipe( gulp.dest( cfg.distDir+cfg.destDirs.js ) )
}

function vendorDev(files){
  return files
    .pipe( gulp.dest( cfg.buildDir+cfg.destDirs.vendor ) )
    .pipe( connect.reload() );
}
function vendorDist(files){
  return files
    .pipe( concat('vendor.min.js') )
    .pipe( gulp.dest( cfg.distDir+cfg.destDirs.vendor ) );
}

function templatesDev(files){
  return files
    .pipe( ngHtml2Js({ moduleName: "app.partials"}) )
    .pipe(replacer(/x.x.x/, function() {
        return pjson.version;
    }))
    .pipe( gulp.dest( cfg.buildDir+cfg.destDirs.js ) )
    .pipe( connect.reload() );
}
function templatesDist(files){
  return files
    .pipe( ngHtml2Js({ moduleName: "app.partials"}) )
    .pipe( uglify() )
    .pipe( concat('partials.min.js') )
    .pipe(replacer(/x.x.x/, function() {
        return pjson.version;
    }))
    .pipe( gulp.dest( cfg.distDir+cfg.destDirs.js ) );
}

function assetsDev(files) {
  return files
    .pipe( gulp.dest( cfg.buildDir+cfg.destDirs.assets ) )
    .pipe( connect.reload() );
}
function assetsDist(files) {
  var filterJson = filter('**/*.json');
  return files
    .pipe( filterJson )
    .pipe( jsonminify() )
    .pipe( filterJson.restore() )
    .pipe( gulp.dest( cfg.distDir+cfg.destDirs.assets ) );
}

function rootHtmlDev() {
  var vendor = prefixVendor(cfg.vendorFiles.js);
  var vendorCss = cfg.buildDir+cfg.destDirs.css+'**/dist/**/*.css';
  var css = cfg.buildDir+cfg.destDirs.css+'**/*.css';
  var js = cfg.buildDir+cfg.destDirs.js+'**/*.js';
  var combo = [];
  for (var i = 0; i <= vendor.length - 1; i++) {
    combo.push(vendor[i]);
  }
  combo.push(vendorCss);
  combo.push(css);
  combo.push(js);
  var comboStream = gulp.src( combo, {read: false} );

  return gulp.src( cfg.appFiles.rootHtml )
    .pipe(replacer(/preview\//, function() {
        return "";
    }))
    .pipe( inject( comboStream,
      {
        addRootSlash: false,
        ignorePath: cfg.buildDir
      }))
    .pipe( gulp.dest( cfg.buildDir ) )
    .pipe( connect.reload() );
}
function rootHtmlDist() {
  var vendor = gulp.src( cfg.distDir+cfg.destDirs.vendor+'**/*.js', {read: false} );
  var css = gulp.src( cfg.distDir+cfg.destDirs.css+'**/*.css', {read: false} );
  var js = gulp.src( cfg.distDir+cfg.destDirs.js+'**/*.js', {read: false} );

  return gulp.src( cfg.appFiles.rootHtml )
    .pipe( inject( mergeStream(css, vendor, js),
      {
        addRootSlash: false,
        ignorePath: cfg.distDir
      }))
    .pipe( gulp.dest( cfg.distDir ) );
}

function bump(mode){
  var pkg = require( './package.json' );
  var newVer = semver.inc(pkg.version, mode);
  return gulp.src(['./bower.json', './package.json', '**/src/package.json'])
    .pipe( bump({'version':newVer}) )
    .pipe( gulp.dest('./') );
}

// --- Tasks ---
// CLEAN
gulp.task('clean', function(cb) {
  rimraf(cfg.buildDir, cb);
});
gulp.task('clean-dist', function(cb) {
  rimraf(cfg.buildDir, function(){});
  rimraf(cfg.distDir, cb);
});

// COPY
gulp.task('copy-vendor-dev', ['clean'], function(){
  return copyVendor();
});
gulp.task('copy-vendor-dist', ['clean-dist'], function(){
  return copyVendor();
});

// SASS
gulp.task('sass-dev', ['clean', 'copy-vendor-dev'], function() {
  return sassDev();
});
gulp.task('sass-dist', ['clean-dist', 'copy-vendor-dist'], function() {
  return sassDist();
});

// JAVASCRIPT
gulp.task('js-dev', ['clean', 'copy-vendor-dev'], function() {
  return jsDev( gulp.src( cfg.appFiles.js ) );

});
gulp.task('js-dist', ['clean-dist', 'copy-vendor-dist'], function() {
  return jsDist( gulp.src( cfg.appFiles.js ) );
});

gulp.task('vendor-dev', ['clean', 'copy-vendor-dev'], function(){
  return vendorDev( mergeStream( 
    gulp.src( prefixVendor(cfg.vendorFiles.js), {base: "vendor"} ),
    gulp.src( prefixVendor(cfg.vendorFiles.map), {base: "vendor"} ) 
  ) );
})
gulp.task('vendor-dist', ['clean-dist', 'copy-vendor-dist'], function(){
  return vendorDist( gulp.src( prefixVendor(cfg.vendorFiles.js), {base: "vendor"} ) );
})

// TEMPLATES
gulp.task('templates-dev', ['clean', 'copy-vendor-dev'],  function() {
  return templatesDev( gulp.src( cfg.appFiles.tpl ) );
});
gulp.task('templates-dist', ['clean-dist', 'copy-vendor-dist'],  function() {
  return templatesDist( gulp.src( cfg.appFiles.tpl ) );
});

// ASSETS
gulp.task('assets-dev', ['clean', 'copy-vendor-dev'], function() {
  return assetsDev( gulp.src( cfg.appFiles.assets ) );
});
gulp.task('assets-dist', ['clean-dist', 'copy-vendor-dist'], function() {
  return assetsDist( gulp.src( cfg.appFiles.assets ) );
});

// INDEX
gulp.task('root-html-dev', ['clean', 'copy-vendor-dev', 'js-dev', 'sass-dev', 'vendor-dev', 'templates-dev'], rootHtmlDev);
gulp.task('root-html-dist', ['clean-dist', 'copy-vendor-dist', 'js-dist', 'sass-dist', 'vendor-dist', 'templates-dist'], rootHtmlDist);

// UPLOADS ALL FILES IN DIST TO REMOTE
gulp.task('upload', ['compile'], function() {
  return gulp.src(cfg.distDir+'**/')
        .pipe(sftp({
            host: cfg.server,
            auth: 'keyMain',
            remotePath: cfg.serverDir
        }));
});

// WATCHES FILES
gulp.task('watch', ['build'], function () {
  connect.server({
    root: cfg.buildDir,
    livereload: true
  });
  watch({glob: cfg.appFiles.sass}, sassDev);
  watch({glob: cfg.appFiles.js}, jsDev );
  watch({glob: cfg.appFiles.rootHtml}, rootHtmlDev );
  watch({glob: cfg.appFiles.tpl}, templatesDev );
  watch({glob: cfg.appFiles.assets}, assetsDev );
  watch({glob: prefixVendor(cfg.vendorFiles.js)}, vendorDev );
});

// VERSIONING
gulp.task('bump-patch', function () { 
  return gulp.src(cfg.packageJSON)
        .pipe(bump({type:'patch'}))
        .pipe(gulp.dest('./'));
});
gulp.task('bump-minor', function () { 
  return gulp.src(cfg.packageJSON)
        .pipe(bump({type:'minor'}))
        .pipe(gulp.dest('./')); 
});
gulp.task('bump-major', function () { 
  return gulp.src(cfg.packageJSON)
        .pipe(bump({type:'major'}))
        .pipe(gulp.dest('./')); 
});

// TASKS OF TASKS
gulp.task('build', ['clean', 'copy-vendor-dev', 'vendor-dev', 'js-dev', 'sass-dev', 'assets-dev', 'root-html-dev']);
gulp.task('dev', ['build', 'watch']);

gulp.task('compile', ['clean', 'copy-vendor-dist', 'vendor-dist', 'js-dist', 'sass-dist', 'assets-dist', 'root-html-dist']);
gulp.task('package', ['clean-dist', 'compile']);
gulp.task('server', ['clean-dist', 'compile', 'upload']);

// Default Task
gulp.task('default', ['dev']);
