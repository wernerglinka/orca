# Building Pages Dynamically

## Building the Home Page

The process to build the home page uses the [metalsmith-metadata](https://github.com/segmentio/metalsmith-metadata) plugin to load global metadata from files. E.g., JSON data from the ORCA server will be converted into a simple JSON file and the plugin does the rest.


### Converting API Data into Home Page JSON
The custom plugin /local_modules/metalsmith-build-home-page queries the ORCA API for the home page content data and converts it into /dev/content/data/home-page.json. The JSON file's data will then be injected into the template file index.njk using the metalsmith-metadata plugin. index.njk will then be processed into an html file by the template engine Nunjucks.


## Building the Blog Pages
Blog post pages are generated directly in the custom plugin /local_modules/metalsmith-build-blog-posts. Instead of using a pre-existing template file, the plugin generates a template file for each blogpost and places the file into dev/content/blog. Blogposts may be processed with various metalsmith plugins later.

In addition to building the blogpost pages, the metalsmith-build-blog-posts plugin also creates metadata with selected blogpost properties. These metadata may be use on other pages to create various lists, for example: the last n blogposts, authors, other blogposts by this author etc...


### Plugin Invocation in gulp.js
```
.use(metadata({
    "homePage": "data/home-page.json",
    "blogPosts": "data/blogposts.json"
}))
```