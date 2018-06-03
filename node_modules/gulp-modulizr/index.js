var through = require("through2"),
    gutil = require("gulp-util");

var modulizr = require("./modulizr-wrapper");

module.exports = function (tests) {
    "use strict";

    if (!tests) {
        throw new gutil.PluginError("gulp-modulizr", "No param supplied");
    }

    function gulpModulizr(file, enc, callback) {

        if (file.isNull()) {
            this.push(file);
            return callback();
        }

        if (file.isStream()) {
            this.emit("error", new gutil.PluginError("gulp-modulizr", "Stream content is not supported"));
            return callback();
        }

        if (file.isBuffer()) {

            file.contents = new Buffer(
                modulizr.ize(
                    String(file.contents),
                    tests
                )
            );

            this.push(file);

        }

        return callback();
    }

    return through.obj(gulpModulizr);
};
