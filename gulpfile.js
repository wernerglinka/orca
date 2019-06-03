/* global require, process, console, __dirname */

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
const permalinks = require('metalsmith-permalinks');
const collections = require('metalsmith-collections');
const pagination = require('metalsmith-pagination');
const inPlace = require('metalsmith-in-place');
const layouts = require('metalsmith-layouts');
const assets = require('metalsmith-assets');
const sitemap = require('metalsmith-sitemap');
const robots = require('metalsmith-robots');
const metadata = require('metalsmith-metadata');
const writemetadata = require('metalsmith-writemetadata');
const renamer = require('metalsmith-renamer');
const msIgnore = require('metalsmith-ignore');
const msIf = require('metalsmith-if');
const highlightCode = require('metalsmith-prism');
const nunjucks = require('nunjucks');
const CaptureTag = require('nunjucks-capture');
const dateFilter = require('nunjucks-date-filter');
const postsList = require('./local_modules/metalsmith-blog-helper');

const buildHomePage = require('./local_modules/metalsmith-build-home-page');
const buildBlogPosts = require('./local_modules/metalsmith-build-blog-posts');
const blogPostsList = require('./local_modules/metalsmith-blog-post-lists');

const monitor = require('./local_modules/metalsmith-monitor');
const message = require('./local_modules/metalsmith-message');

// template engine
const categories = require('./local_modules/metalsmith-categories-with-metadata');
const tags = require('./local_modules/metalsmith-tags-with-metadata');

nunjucks
  .configure(['./dev/layouts', './dev/layouts/partials'], { watch: false, autoescape: false })
  .addExtension('CaptureTag', new CaptureTag())

// converts a date into a UTC string. Needed for XML dates
  .addFilter('UTCdate', date => date.toUTCString())
  .addFilter('makeIdentifier', str => str.replace(/\s+/g, '-').toLowerCase())
  .addFilter('is_string', obj => typeof obj === 'string')
  .addFilter('is_array', obj => Array.isArray(obj))
  .addFilter('dateFilter', dateFilter)
// replaces a file extension with a "/". Needed in generating custom XML feeds
  .addFilter('makePermalink', obj => obj.replace(/.html/g, '/'))
// when building an XML page any text that contains html "<", ">" and "&" characters need to be escaped
  .addFilter('escapeHTML', text => (text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')))
// strips all html from a string
  .addFilter('stripHTML', htmlString => htmlString.replace(/<[^>]+>/g, ''))
  .addFilter('spaceToDash', string => string.replace(/\s+/g, '-'));

const sourcePath = '/dev/';
const contentPath = 'dev/content';
const assetPath = 'dev/sources';
const scriptPath = 'dev/scripts';
const stylePath = 'dev/styles';
const layoutPath = 'dev/layouts';
const destPath = 'build';

function setupMetalsmith(callback) {
  metalsmith(__dirname)
    .source(contentPath)
    .destination(destPath)
    .clean(true)

  // create the build timestamp
    .metadata({
      buildDate: new Date()
    })

  // get metadata from the yml files in dev/content/data
    .use(metadata({
      site: 'data/site.yml'
    }))

  // ignore these files in the build process
    .use(msIgnore(
      'data/**/*'
    ))

  // get the content from ORCA Server
    .use(buildHomePage())
  // .use(monitor())
    .use(message('done with homepage'))
    .use(buildBlogPosts())
    .use(blogPostsList({
      latest_quantity: 7
    }))
  // .use(monitor())
    .use(message('done with blogposts'))

  // .use(() => {
  //    console.log(__dirname);
  // })

    .use(categories({
      handle: 'categories',
      path: 'blog/categories/:category.html',
      pathPage: 'blog/categories/:category/:num/index.html',
      perPage: 2,
      layout: 'blog.html',
      sortBy: 'date',
      reverse: true,
      skipMetadata: false,
      addMetadata: {
        body_classes: 'blog blog-landing-page',
        is_category_page: true
      },
      slug: {
        mode: 'rfc3986'
      }
    }))

    .use(tags({
      handle: 'tags',
      path: 'blog/topics/:tag.html',
      pathPage: 'blog/topics/:tag/:num/index.html',
      perPage: 2,
      layout: 'blog.html',
      sortBy: 'date',
      reverse: true,
      skipMetadata: false,
      addMetadata: {
        body_classes: 'blog blog-landing-page',
        is_tag_page: true
      },
      slug: {
        mode: 'rfc3986'
      }
    }))

    .use(collections({
      blog: {
        sortBy: 'date',
        reverse: true
      }
    }))

    .use(pagination({
      'collections.blog': {
        perPage: 5,
        layout: 'blog.html',
        first: 'blog/1/index.html',
        path: 'blog/:num/index.html',
        pageMetadata: {
          title: 'The Blog',
          body_classes: 'blog-landing-page',
          is_blog: true
        }
      }
    }))

    .use(postsList({
      latest_quantity: 3, // length of the recent posts list
      featured_quantity: 3 // length of the featured posts list
    }))

  // apply templates
    .use(inPlace({
      engine: 'nunjucks',
      directory: './dev/layouts',
      partials: './dev/layouts/partials'
    }))

    .use(assets({
      source: assetPath
    }))

    .use(highlightCode({
      lineNumbers: true
    }))

    .use(permalinks({
      pattern: ':collections/:title'
    }))

  // layout must be located behind permalinks for the categories and
  // tags pager links to be formed properly
    .use(layouts({
      engine: 'nunjucks',
      directory: './dev/layouts',
      partials: './dev/layouts/partials'
    }))

    .use(writemetadata({
      pattern: ['**/*.html'],
      ignorekeys: ['next', 'contents', 'previous'],
      bufferencoding: 'utf8'
    }))

  // .use(monitor())

    .build((err) => {
      if (err) {
        console.log(err);
        return callback(err);
      }
      callback();
    });
}

// Gulp tasks
gulp.task('metalsmith', (callback) => {
  setupMetalsmith(callback);
});


gulp.task('vendorScripts', () => gulp.src([
  'node_modules/jquery/dist/jquery.js',
  'node_modules/jquery.easing/jquery.easing.js',
  'node_modules/isotope-layout/dist/isotope.pkgd.min.js'
])
  .pipe(concat('vendors.min.js'))
  .pipe(compressJS())
  .pipe(gulp.dest(path.join(__dirname, assetPath, 'assets/scripts'))));

gulp.task('scripts', () => gulp.src(path.join(__dirname, scriptPath, '**/*.js'))
  .pipe(sourcemaps.init())
  .pipe(babel())
  .pipe(concat('main.js'))
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest(path.join(__dirname, assetPath, 'assets/scripts'))));

gulp.task('prodScripts', () => gulp.src(path.join(__dirname, scriptPath, '**/*.js'))
  .pipe(babel())
  .pipe(concat('main.js'))
  .pipe(gulp.dest(path.join(__dirname, assetPath, 'assets/scripts'))));

// compile style sheet for development
gulp.task('styles', () => gulp.src(path.join(__dirname, stylePath, 'main.scss'))
  .pipe(sourcemaps.init())
  .pipe(sass({ style: 'expanded' }))
  .pipe(autoprefixer('last 2 version'))
  .pipe(sourcemaps.write())
  .pipe(gulp.dest(path.join(__dirname, assetPath, 'assets/styles'))));

gulp.task('prodStyles', () => gulp.src(path.join(__dirname, stylePath, 'main.scss'))
  .pipe(sass({ style: 'expanded' }))
  .pipe(autoprefixer('last 2 version'))
  .pipe(gulp.dest(path.join(__dirname, assetPath, 'assets/styles'))));

gulp.task('buildDev', (cb) => {
  sequence([
    'vendorScripts',
    'scripts',
    'styles'
  ],
  'metalsmith',
  cb);
});

gulp.task('buildProd', (cb) => {
  sequence([
    'vendorScripts',
    'prodScripts',
    'prodStyles'
  ],
  'metalsmith',
  cb);
});

// having buildDev as a dependency for the refresh task insures that they are executed before browerSync is run
// reference: browsersync.io/docs/gulp
gulp.task('refresh', ['buildDev'], (done) => {
  browserSync.reload();
  done();
});

gulp.task('default', ['buildDev'], () => {
  browserSync.init({
    server: {
      baseDir: 'build'
    },
    open: false
  });

  gulp.watch([
    './dev/scripts/**/*',
    './dev/styles/**/*',
    './dev/content/**/*',
    './dev/layouts/**/*'
  ], ['refresh']);
});
