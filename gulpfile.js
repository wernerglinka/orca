
/*global require, process, console, __dirname*/

const path = require('path');
const browserSync = require('browser-sync').create();


const gulp = require('gulp');
const sequence = require('gulp-sequence');
const order = require('gulp-order');
const sass = require('gulp-sass');
const babel = require('gulp-babel');
const sourcemaps = require('gulp-sourcemaps');
const autoprefixer = require('gulp-autoprefixer');
const concat = require('gulp-concat');
const compressJS = require('gulp-uglify');
const cleanCSS = require('gulp-clean-css');

const metalsmith = require('metalsmith');
const drafts = require('metalsmith-drafts');
const tags = require('./local_modules/metalsmith-tags-with-metadata');
const categories = require('./local_modules/metalsmith-categories-with-metadata');
const permalinks = require('metalsmith-permalinks');
const collections = require('metalsmith-collections');
const pagination = require('metalsmith-pagination');
const inPlace = require('metalsmith-in-place');
const assets = require('metalsmith-assets');
const sitemap = require('metalsmith-sitemap');
const robots = require('metalsmith-robots');
const metadata = require('metalsmith-metadata');
const writemetadata = require('metalsmith-writemetadata');
const renamer = require('metalsmith-renamer');
const msIgnore = require('metalsmith-ignore');
const msIf = require('metalsmith-if');

const buildHomePage = require('./local_modules/metalsmith-build-home-page');
const buildBlogPosts = require('./local_modules/metalsmith-build-blog-posts');

const monitor = require('./local_modules/metalsmith-monitor');

const CaptureTag = require('nunjucks-capture');
const dateFilter = require('nunjucks-date-filter');
const UTCdate = function (date) {
    "use strict";
    return date.toUTCString();
};


const contentPath = "dev/content";
const assetPath = "dev/sources";
const scriptPath = "dev/scripts";
const stylePath = "dev/styles";
const layoutPath = "dev/layouts";
const destPath = "build";



function setupMetalsmith(callback) {
    'use strict';

    metalsmith(__dirname)

        .use(buildHomePage())

        .use(buildBlogPosts())

        .source('dev/content')
        .destination('build')
        .clean(true)

        .use(metadata({
            "homePage": "data/home-page.json",
            "blogPosts": "data/blogposts.json"
        }))

        //.use(monitor())

        .use(inPlace({
            "engineOptions": {
                root: __dirname + '/dev/',
                filters: {
                    dateFilter: dateFilter,
                    UTCdate: UTCdate
                }
            }
        }))

        .use(assets({
            "source": assetPath
        }))

        .use(permalinks({
            "pattern": ":collections/:title"
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

gulp.task("prodScripts", function () {
    "use strict";
    return gulp.src(path.join(__dirname, scriptPath, "**/*.js"))
        .pipe(babel())
        .pipe(concat("main.js"))
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

gulp.task("prodStyles", function () {
    "use strict";
    return gulp.src(path.join(__dirname, stylePath, "main.scss"))
        .pipe(sass({style: "expanded"}))
        .pipe(autoprefixer("last 2 version"))
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
            cb);
});

gulp.task("buildProd", function (cb) {
    "use strict";
    sequence([
        "vendorScripts",
        "prodScripts",
        "prodStyles"
    ],
            "metalsmith",
            cb);
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
