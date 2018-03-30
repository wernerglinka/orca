# Building the Home Page

The process to build the home page will use the [metalsmith-metadata](https://github.com/segmentio/metalsmith-metadata) plugin to load global metadata from files. E.g., JSON data from the ORCA server will be converted into a simple JSON file and the plugin does the rest during the build. 


## Converting API Data into Home Page JSON
The custom plugin /local_modules/metalsmith-build-home-page queries the ORCA API for the home page content data and converts it into /dev/content/data/home-page.json.


## Plugin Invocation in gulp.js
```
.use(metadata({
    "homePage": "data/home-page.json"
}))
```
