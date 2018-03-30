/* eslint-disable*/
var slug = require('slug');

/**
 * A metalsmith plugin to create dedicated pages for blog categories.
 *
 * @return {Function}
 */
function plugin(opts) {
  /**
   * Holds a mapping of category names to an array of files with that category.
   * @type {Object}
   */
  var categoryList = {};
  var tempCategoryCloud = [];
  var categoryCloud = [];

  opts = opts || {};
  opts.path = opts.path || 'categories/:category/index.html';
  opts.pathPage = opts.pathPage || 'categories/:category/:num/index.html';
  opts.layout = opts.layout;
  // this is the frontmatter key
  opts.handle = opts.handle || 'categories';
  opts.metadataKey = opts.metadataKey || 'categories';
  opts.sortBy = opts.sortBy || 'title';
  opts.reverse = opts.reverse || false;
  opts.perPage = opts.perPage || 0;
  opts.skipMetadata = opts.skipMetadata || false;
  opts.slug = opts.slug || {
    mode: 'rfc3986'
  };
  opts.addMetadata = opts.addMetadata || {};

  return function(files, metalsmith, done) {
    /**
     * Get a safe category
     * @param {string} a category name
     * @return {string} safe category
     */
    function safeCategory(category) {
      if (typeof opts.slug === 'function') {
        return opts.slug(category);
      }

      return slug(category, opts.slug);
    }

    /**
     * Sort categorie by property given in opts.sortBy.
     * @param {Object} a Post object.
     * @param {Object} b Post object.
     * @return {number} sort value.
     */
    function sortBy(a, b) {
      a = a[opts.sortBy];
      b = b[opts.sortBy];
      if (!a && !b) {
        return 0;
      }
      if (!a) {
        return -1;
      }
      if (!b) {
        return 1;
      }
      if (b > a) {
        return -1;
      }
      if (a > b) {
        return 1;
      }
      return 0;
    }

    function getFilePath(path, opts) {
      return path
        .replace(/:num/g, opts.num)
        .replace(/:category/g, safeCategory(opts.category));
    }

    // Find all categories and their associated files.
    // Using a for-loop so we don't incur the cost of creating a large array
    // of file names that we use to loop over the files object.
    for (var fileName in files) {
      var data = files[fileName];
      if (!data) {
        continue;
      }

      var categoriesData = data[opts.handle];

      // If we have category data for this file then turn it into an array of
      // individual categories where each category has been sanitized.
      if (categoriesData) {
        // Convert data into array.
        if (typeof categoriesData === 'string') {
          categoriesData = categoriesData.toLowerCase().split(',');
          //categoriesData = categoriesData.split(',');
        }

        // Re-initialize categories array.
        data[opts.handle] = [];

        categoriesData.forEach(function(rawCategory) {
          // Trim leading + trailing white space from category.
          var category = String(rawCategory.trim());


          // Save url safe formatted and display versions of category data
          data[opts.handle].push({
            name: category,
            slug: safeCategory(category)
          });

          // build the category cloud
          if (!tempCategoryCloud[category]) {
            tempCategoryCloud[category] = [];
            tempCategoryCloud[category]['categoryName'] = category;
            tempCategoryCloud[category]['occurences'] = 1;
            tempCategoryCloud[category]['path'] = '/blog/categories/' + safeCategory(category);
          } else {
            tempCategoryCloud[category]['occurences']++;
          }

          // Add each category to our overall categoryList and initialize array if it
          // doesn't exist.
          if (!categoryList[category]) {
            categoryList[category] = [];
          }

          // Store a reference to where the file data exists to reduce our
          // overhead.
          categoryList[category].push(fileName);
        });
      }
    }

    // turn tempCayegoryCloud into a real array and sort
    for (var key in tempCategoryCloud) categoryCloud.push([key, tempCategoryCloud[key]]);
    categoryCloud.sort(function(a, b) {
      a = a[0];
      b = b[0];
      return a < b ? -1 : (a > b ? 1 : 0);
    });

    // Add to metalsmith.metadata for access outside of the tag files.
    if (!opts.skipMetadata) {
      var metadata = metalsmith.metadata();
      metadata[opts.metadataKey] = metadata[opts.metadataKey] || {};
    }

    // add the tagCloud to the metadata
    metadata['categoryCloud'] = categoryCloud;

    for (var category in categoryList) {
      // Map the array of categoryList names back to the actual data object.
      // Sort categories via opts.sortBy property value.
      var posts = categoryList[category].map(function(fileName) {
        return files[fileName];
      }).sort(sortBy);

      // Reverse posts if desired.
      if (opts.reverse) {
        posts.reverse();
      }

      if (!opts.skipMetadata) {
        metadata[opts.metadataKey][category] = posts;
        metadata[opts.metadataKey][category].urlSafe = safeCategory(category);
      }

      // If we set opts.perPage to 0 then we don't want to paginate and as such
      // we should have all posts shown on one page.
      var postsPerPage = opts.perPage === 0 ? posts.length : opts.perPage;
      var numPages = Math.ceil(posts.length / postsPerPage);
      var pages = [];

      for (var i = 0; i < numPages; i++) {
        var pageFiles = posts.slice(i * postsPerPage, (i + 1) * postsPerPage);

        // Generate a new file based on the filename with correct metadata.
        var page = {
          layout: opts.layout,
          contents: '',
          category: category,
          pagination: {
            num: i + 1,
            pages: pages,
            category: category,
            files: pageFiles
          }
        };

        // Render the non-first pages differently to the rest, when set.
        if (i > 0 && opts.pathPage) {
          page.path = getFilePath(opts.pathPage, page.pagination);
        } else {
          page.path = getFilePath(opts.path, page.pagination);
        }

        // Add new page to files object.
        files[page.path] = page;

        // Update next/prev references.
        var previousPage = pages[i - 1];
        if (previousPage) {
          page.pagination.previous = previousPage;
          previousPage.pagination.next = page;
        }

        pages.push(page);
      }
    }

    ////////////////////////////////////////////////////////////
    // add metadata
    Object.assign(metadata, opts.addMetadata);
    ////////////////////////////////////////////////////////////

    // update metadata
    if (!opts.skipMetadata) {
      metalsmith.metadata(metadata);
    }

    /* clearing this after each pass avoids
     * double counting when using metalsmith-watch
     */
    categoryList = {};
    done();

  };
}

/**
 * Expose `plugin`.
 */
module.exports = plugin;