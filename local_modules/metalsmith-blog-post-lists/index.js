/* eslint-disable */

module.exports = plugin;

/**
 * Metalsmith plugin to create a recent blogpost list
 */
function plugin(opts){
    return function (files, metalsmith, done){
        setImmediate(done);

        var latestBlogPosts = [];
        var featuredBlogPosts = [];
        var allSortedBlogPosts = [];
        var temp = [];
        var options = [];
        options.latest_quantity = opts.latest_quantity === 'undefined' ? 4 : opts.latest_quantity;
        options.featured_blog_post_sort_order = opts.featured_blog_post_sort_order === 'undefinend' ? "asc" : opts.featured_blog_post_sort_order;
        options.featured_quantity = opts.featured_quantity === 'undefined' ? 4 : opts.featured_quantity;

        Object.keys(files).forEach(function(file){

            if ((file.indexOf('blog/') !== -1) && (file.indexOf('.md') !== -1)) {

                // assemble all blogs list
                // this list can be used when the whole list of blog posts is not available like
                // when using pagination, NOT all blog posts will be available on a paginated page
                temp = {
                    title:  files[file].title,
                    date:   files[file].date,
                    author: files[file].author,
                    path:   files[file].path.replace('.md', ''),
                    image:  files[file].image.feature
                }
                allSortedBlogPosts.push(temp);
                allSortedBlogPosts.sort(function(a,b) {
                    return a.date.getTime() - b.date.getTime();
                });


                // assemble latest blogposts
                temp = {
                    title:  files[file].title,
                    date:   files[file].date,
                    author: files[file].author,
                    path:   files[file].path.replace('.md', '')
                }
                latestBlogPosts.push(temp);
                latestBlogPosts.sort(function(a,b) {
                    return a.date.getTime() - b.date.getTime();
                })
                .reverse()
                .splice(options.latest_quantity);


                // assemble featured blog posts
                // requires:
                //    featured_blog_post: true
                //    featured_blog_post_order: <integer>
                //    featured_blog_post_sort_order: "asc" | "desc"
                // to be set in the files frontmatter
                if ( files[file].featured_blog_post) {
                    temp = {
                        title:  files[file].title,
                        date:   files[file].date,
                        author: files[file].author,
                        path:   files[file].path.replace('.md', ''),
                        order:  files[file].featured_blog_post_order
                    }
                    featuredBlogPosts.push(temp);
                    featuredBlogPosts.sort(function(a,b) {
                        return a.order - b.order;
                    });
                    if (options.featured_blog_post_sort_order === 'desc') {
                        featuredBlogPosts.reverse();
                    }
                    featuredBlogPosts.splice(options.featured_quantity);
                }
            }

            // Add to metalsmith.metadata for global access
            var metadata = metalsmith.metadata();
            metadata['latestBlogPosts'] = latestBlogPosts;
            metadata['featuredBlogPosts'] = featuredBlogPosts;
            metadata['allSortedBlogPosts'] = allSortedBlogPosts;

            // update metadata
            metalsmith.metadata(metadata);

            done();
        });
    };
}


