# Project ORCA

The goal of the ORCA project is to build a headless Drupal8 server that feeds data into a local Metalsmith-based static-site build process. Server data are used to build pages dynamically at build time using Metalsmith as the site generator and the Nunjucks template engine.

The ORCA server resides on [Pantheon](https://pantheon.io/) at http://live-orca.pantheonsite.io and the ORCA website resides on [Netlify](https://www.netlify.com/) at http://orca.netlify.com.

## ORCA Server
The server part is implemented with Drupal 8 using the minimal installation profile, e.g. only 9 modules are enabled and there are no content types defined. [More about built-in installation profiles here](https://www.drupal.org/docs/7/install/built-in-installation-profiles-drupal-7)

The following core/contrib modules are enabled to facilitate managing content:

- Admin Toolbar
- CKEditor
- Datetime
- Devel
- Field UI
- File
- Image
- Insert
- JSON API
- Link
- Module Filter
- Serialization
- Taxonomy
- Telephone
- Text
- Text Editor
- Toolbar
- Update ManagerContent Types

ORCA is essentially an SPA with an attached blog. Several content types are defined to manage data.
 
- Blog Author
- Blogpost
- Home Page
- Projects
- Services
- Testimonials

Content types use various [fields](https://www.drupal.org/docs/7/nodes-content-types-and-fields/working-with-content-types-and-fields-drupal-7-and-later) to structure data logically. Relationships between content types are used to access images and taxonomy terms on the client side.

Image assets are served from the server.

### API
The API is implemented with the JSON API module. The module doesn’t need any configuration and implements the [json:api specification](http://jsonapi.org/)

The module provides various ways to access data. [A great introduction is available on YouTube](https://www.youtube.com/playlist?list=PLZOQ_ZMpYrZsyO-3IstImK1okrpfAjuMZ)

The author of the videos uses [Postman](https://www.getpostman.com/)  to guide the viewer through the application of the API. This app makes experimenting extremely easy and speeds up the leaning curve of the API.

API queries can be tried out with Postman and then can be used in the ORCA client without modifications.

## ORCA Client
The ORCA Client really is a static-site build process that fetches data from the ORCA Server during the build so all pages are fully build before the site is deployed. None of the pages is build or augmented through AJAX. That has the benefit that search engine spiders can index every page with all the content available… great for SEO.

The build process is Node/Javascript based and uses [Gulp](https://gulpjs.com/), [Metalsmith](http://www.metalsmith.io/) and the template engine [Nunjucks](https://mozilla.github.io/nunjucks/templating.html).

The build process uses [SASS](https://www.npmjs.com/package/gulp-sass) and [Babel](https://babeljs.io/) so we can take advantage of [ES2016+](http://exploringjs.com/es2016-es2017/) language features. 

There are two custom Metalsmith plugins that act as the interface between the Drupal 8 API and the Metalsmith metadata plugin.
Each plugin provides the data to build a particular page type: the **home page** and a **blogpost page**. 

- metalsmith-build-home-page
- metalsmith-build-blog-posts

### Home Page
The home page is build by converting ORCA API data into a simple local JSON object that is then stored in the data directory. Using the Metalsmith-metadata plugin the local JSON object is then used to populate the predefined home page Nunjucks template.

### Blogpost Page
Blogpost pages are build via a template string in the plugin, one by one. In parallel the plugin also builds a metadata object that can be used by other pages - in this case the home page - to prepare blog specific lists such as last n blogs, blogs by a certain author, other blog by this author etc.…
