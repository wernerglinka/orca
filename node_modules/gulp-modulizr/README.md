# Build custom Modernizr with gulp

`gulp-modulizr` is a Modernizr builder for your project. It is based on the Modernizr team's [Modulizr](https://github.com/Modernizr/modernizr.com/blob/gh-pages/i/js/modulizr.js) tool.


## Usage

```javascript
gulp.task("custom-modernizr", function() {
    return gulp.src("bower_components/modernizr/modernizr.js")
        .pipe(require("gulp-modulizr")([
            "cssclasses",
            "svg",
            "url-data-uri"
        ]))
        .pipe(require("gulp-add-src")([
            "bower_components/modernizr/feature-detects/url-data-uri.js"
        ]))
        .pipe(require("gulp-concat")("custom-modernizr.js"))
        .pipe(gulp.dest("public/assets");
});

```
