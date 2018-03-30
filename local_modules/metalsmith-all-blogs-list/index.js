/*global jQuery, body, window*/
/*eslint no-console: "allow"*/
module.exports = plugin;

/**
 * Metalsmith plugin to create a recent blogpost list
 */
function plugin(opts) {
  return function(files, metalsmith, done) {
    setImmediate(done);

    // since we are using year as the array keys we are using objects. Arrays would add thousands of rows if a key is 2017 for example
    var allUnsortedBlogPosts = {};
    var allBlogPosts = [];
    var temp = {};

    Object.keys(files).forEach(function(file) {
      if (file.indexOf('blog/') !== -1 && file.indexOf('.md') !== -1) {
        // get the year from the blog date
        var d = new Date(files[file].date);
        postYear = d.getFullYear().toString();

        // build the annualized blog list
        if (!allUnsortedBlogPosts[postYear]) {
          allUnsortedBlogPosts[postYear] = [];
        }

        temp = {
          blog_title: files[file].blog_title,
          date: files[file].date,
          author: files[file].author,
          path: files[file].path.replace('.md', '')
        };
        allUnsortedBlogPosts[postYear].push(temp);
      }
    });

    // sort allUnsortedBlogPosts by newest year first
    // turn allUnsortedBlogPosts into a real array and sort
    for (var key in allUnsortedBlogPosts) {
      allBlogPosts.push([key, allUnsortedBlogPosts[key]]);
    }
    allBlogPosts.sort(function(a, b) {
      a = a[0];
      b = b[0];
      return a > b ? -1 : (a < b ? 1 : 0);
    });

    // now we have an associative array with year keys, e.g.
    // [ '2017', [ { blog post }, { blog post }, ...]], [ '2016', [ ... ]]
    // sort the blog posts for a year
    for ( var index in allBlogPosts ) {
      allBlogPosts[index][1].sort(function(a, b) {
        a = a.date;
        b = b.date;
        return a > b ? -1 : (a < b ? 1 : 0);
      });
    }

    // Add to metalsmith.metadata for global access
    var metadata = metalsmith.metadata();
    metadata['allBlogPosts'] = allBlogPosts;

    // update metadata
    metalsmith.metadata(metadata);

    done();
  };
}
