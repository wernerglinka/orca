module.exports = {

    ize: function(source, tests) {

        eval(
            require('fs').readFileSync(
                require('path').resolve(__dirname, 'modulizr.js')
            ).toString()
        );

        return Modulizr.ize(source, tests);
    }

};
