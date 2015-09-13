var gulp        = require('gulp'),
    gutil       = require('gulp-util'),
    gsass       = require('gulp-sass'),
    inject      = require('gulp-inject'),
    watch       = require('gulp-watch'),
    ngHtml2Js   = require('gulp-ng-html2js'),
    minifyHtml  = require('gulp-minify-html'),
    concat      = require('gulp-concat'),
    uglify      = require('gulp-uglify'),
    csso        = require('gulp-csso'),
    del         = require('del'),
    replacer    = require('gulp-replace'),
    jshint      = require('gulp-jshint'),
    stylish     = require('jshint-stylish'),
    ngAnnotate  = require('gulp-ng-annotate'),

    // Meta
    merge       = require('merge-stream'),
    addsrc      = require('gulp-add-src'),
    connect     = require('gulp-connect'),
    bump        = require('gulp-bump'),
    sftp        = require('gulp-sftp'),
    semver      = require('semver'),

    // Config
    cfg         = require('./build.config.js'),
    pkg         = require(cfg.pkg);

/////////////////////////////////////////////////////////////

// Other configuration - makes sure that vendor files work as globs
cfg.vendor.js = prefixVendor(cfg.vendor.js);
cfg.vendor.map = prefixVendor(cfg.vendor.map);
cfg.vendor.css = prefixVendor(cfg.vendor.css);
cfg.vendor.fonts = prefixVendor(cfg.vendor.fonts);

// Prefixes vendor files with their actual location
function prefixVendor(globArray) {
  var prefix = function(a){return cfg.vendor.src + '/**/' + a; };
  return globArray.map(prefix);
}

// Sets production status to true
function setPro() {
  cfg.production = true;
  gutil.log('Production status is true');
}

// Deletes build directory
function clean() {
  return del([cfg.build+'**/*', cfg.build]);
}

// Compiles vendor and app sass together into one file in build dir
function sass(){
  gulp.src(cfg.app.rootSass)
    .pipe(gsass({style: 'compressed'}))
    .on('error', function(err){
      gutil.log('\x1b[31msass error\x1b[39m:\n'+err.messageFormatted);
    })
    .pipe(cfg.production ? csso() : gutil.noop())
    .pipe(cfg.production ? concat(cfg.min.css) : gutil.noop())
    .pipe(gulp.dest(cfg.build+cfg.dest.css))
    .pipe(connect.reload());
  return gulp.src(cfg.vendor.css)
    .pipe(concat(cfg.min.vendorCSS))
    .pipe(gulp.dest(cfg.build+cfg.dest.css))
    .pipe(connect.reload());
}

// Copies js files into build dir
function js(){
  return gulp.src(cfg.app.js)
    .pipe(cfg.production ? gutil.noop() : jshint())
    .pipe(cfg.production ? gutil.noop() : jshint.reporter(stylish))
    .pipe(cfg.production ? replacer("html5Mode(false)", function() {
      return "html5Mode(true)";
    }) : gutil.noop())
    .pipe(ngAnnotate()).on('error', function(err){
      gutil.log('\x1b[31mjs error\x1b[39m: '+err.message);
    })
    .pipe(cfg.production ? uglify() : gutil.noop())
    .pipe(cfg.production ? concat(cfg.min.js) : gutil.noop())
    .pipe(gulp.dest(cfg.build+cfg.dest.js))
    .pipe(connect.reload());
}

// Copies vendor js files into build dir
function vendor(){
  return gulp.src(cfg.vendor.js)
    .pipe(concat(cfg.min.vendorJS))
    .pipe(gulp.dest(cfg.build+cfg.dest.js))
    .pipe(connect.reload());
}

// Converts HTML partials to minified JS and copies into build dir
function templates(){
  return gulp.src(cfg.app.tpl)
    .pipe(minifyHtml({empty: true,spare: true,quotes: true}))
    .pipe(ngHtml2Js({moduleName: 'app.partials'}))
    .pipe(cfg.production ? concat(cfg.min.partials) : gutil.noop())
    .pipe(ngAnnotate())
    .pipe(cfg.production ? uglify() : gutil.noop())
    .pipe(replacer(/x.x.x/, function() {
        return pkg.version;
    }))
    .pipe(gulp.dest(cfg.build+cfg.dest.js))
    .pipe(connect.reload());
}

// Copies assets into build dir
function assets() {
  return gulp.src(cfg.app.assets)
    .pipe(gulp.dest(cfg.build+cfg.dest.assets))
    .pipe(connect.reload());
}

// Copies vendor fonts into build dir
function fonts() {
  return gulp.src(cfg.vendor.fonts)
    .pipe(gulp.dest(cfg.build+cfg.dest.fonts))
    .pipe(connect.reload());
}

// Injects js and css files into the root HTML file
function html() {
  var js = gulp.src(cfg.compiled.js, {read: false, root: cfg.build});
  var css = gulp.src(cfg.compiled.css, {read: false, root: cfg.build});
  var combo = merge(js, css)
    .pipe(addsrc.prepend(cfg.build+'/**/'+cfg.min.vendorJS))
    .pipe(addsrc.prepend(cfg.build+'/**/'+cfg.min.vendorCSS));
  return gulp.src(cfg.app.rootHtml)
    .pipe(replacer(/href="\/preview\/"/, function() {
        return "href=\"/\"";
    }))
    .pipe(inject(combo, {
      ignorePath: cfg.build,
      addPrefix: cfg.production ? cfg.dest.prefix : ''}))
    .pipe(cfg.production ? minifyHtml({
        empty: true,
        spare: true,
        quotes: true
    }) : gutil.noop())
    .pipe(gulp.dest(cfg.build))
    .pipe(connect.reload());
}

// Bumps the version numbers in bower and package JSON files
// Requires type, one of patch, minor, or major
function doBump(type){

  // Determines type of bump
  var v = pkg.version;
  if (!type) {
    var dot = v.indexOf('.');
    var major = parseInt(v.slice(0, dot));
    var minor = parseInt(v.slice(dot+1).slice(0, dot));
    var patch = parseInt(v.slice(dot+1).slice(dot+1));
    var type = patch<=10 ? 'patch' : minor<=10 ? 'minor' : 'major';
  }

  var newVer = semver.inc(v);
  return gulp.src([cfg.bower, cfg.pkg])
    .pipe(bump({version: newVer, type: type}))
    .pipe(gulp.dest('.'));
}


// Uploads files to remote
function upload() {
  return gulp.src(cfg.build+'/**')
    .pipe(sftp(cfg.server));
}

// Used in watch - prints that watch is running the function
function go(name, func) {
  gutil.log('Watch triggered for \''+gutil.colors.green(name)+'\'');
  func();
}

// Used in watch - quits with strong message
function quit() {
  var message = 'Exiting Gulp: metafile (gulpfile or config) was changed';
  gutil.log(gutil.colors.red(message));
  process.exit(1);
}

// Tasks
gulp.task('production', setPro);
gulp.task('clean', clean);
gulp.task('sass', ['clean', 'vendor'], sass);
gulp.task('js', ['clean', 'vendor'], js);
gulp.task('vendor', ['clean'], vendor);
gulp.task('templates', ['clean', 'vendor'], templates);
gulp.task('assets', ['clean', 'vendor'], assets);
gulp.task('fonts', ['clean', 'vendor'], fonts);
gulp.task('html', ['vendor', 'js', 'sass', 'assets', 'fonts', 'templates'], html);
gulp.task('upload', ['html'], upload);
gulp.task('watch', ['build'], function () {
  connect.server({
    root: cfg.build,
    livereload: true,
    port: 8888
  });
  watch(cfg.app.sass, function(){go('sass', sass)});
  watch(cfg.app.js, function(){go('js', js)});
  watch(cfg.app.rootHtml, function(){go('html', html)});
  watch(cfg.app.tpl, function(){go('templates', templates)});
  watch(cfg.app.assets, function(){go('assets', assets)});
  watch(cfg.config, quit);
});

// Versioning
gulp.task('bump', doBump);
gulp.task('bump-patch', function(){ return doBump('patch'); });
gulp.task('bump-minor', function(){ return doBump('minor'); });
gulp.task('bump-major', function(){ return doBump('major'); });

// Metatasks
gulp.task('build', ['clean', 'html']);
gulp.task('dev', ['build', 'watch']);
gulp.task('dist', ['production', 'build']);
gulp.task('server', ['dist', 'upload']);
gulp.task('default', ['dev']);
