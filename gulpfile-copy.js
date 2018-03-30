/*jslint regexp: true, nomen: true*/
/*global require, process, console, __dirname*/

var path = require('path');
var browserSync = require('browser-sync').create();


var gulp = require('gulp');
var sequence = require('gulp-sequence');
var order = require('gulp-order');
var sass = require('gulp-sass');
var babel = require('gulp-babel');
var sourcemaps = require('gulp-sourcemaps');
var autoprefixer = require('gulp-autoprefixer');
var concat = require('gulp-concat');
var compressJS = require('gulp-uglify');
var cleanCSS = require('gulp-clean-css');

var metalsmith = require('metalsmith');
var drafts = require('metalsmith-drafts');
var tags = require('./local_modules/metalsmith-tags-with-metadata');
var categories = require('./local_modules/metalsmith-categories-with-metadata');
var permalinks = require('metalsmith-permalinks');
var collections = require('metalsmith-collections');
var pagination = require('metalsmith-pagination');
var layouts = require("metalsmith-layouts");
var inPlace = require('metalsmith-in-place');
var assets = require('metalsmith-assets');
var sitemap = require('metalsmith-sitemap');
var robots = require('metalsmith-robots');
var metadata = require('metalsmith-metadata');
var writemetadata = require('metalsmith-writemetadata');
var renamer = require('metalsmith-renamer');
var ignore = require('metalsmith-ignore');

var CaptureTag = require('nunjucks-capture');
var dateFilter = require('nunjucks-date-filter');
const UTCdate = function (date) {
        "use strict";
        return date.toUTCString();
    }


var contentPath = "./dev/content";
var assetPath = "./dev/sources";
var scriptPath = "./dev/scripts";
var stylePath = "./dev/styles";
var layoutPath = "./dev/layouts";
var destPath = "./build";



function setupMetalsmith(callback) {
    'use strict';

    metalsmith(__dirname)


        .source('dev/content')
        .destination('build')
        .clean(true)

        .use(inPlace({
            "engineOptions": {
              root: __dirname + '/dev/',
              filters: {
                  dateFilter: dateFilter,
                  UTCdate: UTCdate
              }
            }
          }))

        .build(function (err) {
            if (err) {
                console.log(err);
                return callback(err);
            }
            callback();
        });
}

//Gulp tasks
gulp.task("metalsmith", function (callback) {
    "use strict";
    setupMetalsmith(callback);
});


gulp.task("vendorScripts", function () {
    "use strict";
    return gulp.src([
        "node_modules/jquery/dist/jquery.js",
        "node_modules/jquery.easing/jquery.easing.js",
        "node_modules/jquery-hoverintent/jquery.hoverIntent.js",
        "node_modules/js-breakpoints/breakpoints.js"
    ])
        .pipe(concat("vendors.min.js"))
        .pipe(compressJS())
        .pipe(gulp.dest(path.join(__dirname, assetPath, "assets/scripts")));
});

gulp.task("scripts", function () {
    "use strict";
    return gulp.src(path.join(__dirname, scriptPath, "**/*.js"))
        .pipe(sourcemaps.init())
        .pipe(babel())
        .pipe(concat("main.js"))
        .pipe(sourcemaps.write("."))
        .pipe(gulp.dest(path.join(__dirname, assetPath, "assets/scripts")));
});

// compile style sheet for development
gulp.task("styles", function () {
    "use strict";
    return gulp.src(path.join(__dirname, stylePath, "main.scss"))
        .pipe(sourcemaps.init())
        .pipe(sass({style: "expanded"}))
        .pipe(autoprefixer("last 2 version"))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(path.join(__dirname, assetPath, "assets/styles")));
});

gulp.task("buildDev", function (cb) {
    "use strict";
    sequence([
        "vendorScripts",
        "scripts",
        "styles"
    ],
        "metalsmith",
        cb
        );
});

// having buildDev as a dependency for the refresh task insures that they are executed before browerSync is run
// reference: browsersync.io/docs/gulp
gulp.task("refresh", ["buildDev"], function (done) {
    "use strict";
    browserSync.reload();
    done();
});

gulp.task("default", ["buildDev"], function () {
    "use strict";
    browserSync.init({
        server: {
            baseDir: "build"
        },
        open: false
    });

    gulp.watch([
        "./dev/scripts/**/*",
        "./dev/styles/**/*",
        "./dev/content/**/*",
        "./dev/layouts/**/*",
        "./dev/sources/**/*"
    ], ["refresh"]);
});
