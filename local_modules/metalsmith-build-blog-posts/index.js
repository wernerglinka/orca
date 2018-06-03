/*global __dirname, require, console, module, plugin, metalsmith, setImmediate, error, response, data, process, writeFileSync*/
/*jslint for:true*/

const request = require('request');
const fs = require('fs');
const findFolder = require('node-find-folder');
const path = require('path');
const commonTags = require('common-tags');
const getImage = require('get-image');
const cheerio = require('cheerio');

/**
 * Metalsmith plugin to prepare a yml data file from api data
 */
function plugin() {
    'use strict';


    /**
     * getBlogPostsQuery.
     * get a JSON object with all blogposts from the server.
     * @param {string} serverURL 
     * @param {string} page 
     *
     * @return {obj}  the JSON object for all blogposts
     */
    const getBlogPostsQuery = (serverURL, page) => {
        const query = commonTags.oneLineTrim`?_format=json
            &fields[node--blogpost]=title,
                body,
                field_blog_date,
                field_blog_author,
                field_blog_thumbnail,
                field_blog_is_featured,
                field_blog_category,
                field_blog_tags
            &fields[node--blog_author]=title,
                field_position,
                field_author_affiliation,
                field_avatar
            &field[file--file]=uri
            &include=field_blog_author,
                field_blog_thumbnail,
                field_blog_author.field_avatar,
                field_blog_category,
                field_blog_tags`;
        return serverURL + page + query;
    };


    /**
     * buildImageList.
     * images are included via a node relationship with the image file
     * we first build an array of all available images in the response json
     * later we can search all node relationships for the file name and when found
     * we'll find the url of the image.
     *
     * @param {obj} obj     all blogposts obj
     *
     * @return {arrar} all available images
     */
    const buildImageList = (obj) => {
        let availableImages = [];
        // build an array of all available images
        obj.included.forEach(function (element) {
            if (element.type === "file--file") {
                availableImages.push(element);
            }
        });
        return availableImages;
    };


    /**
     * getBlogTn.
     * get the thumbnail url of this thumbnail id.
     *
     * @param {obj}    obj  all images obj
     * @param {string} id   this image id
     *
     * @return {string} this image url
     */
    const getBlogTn = (obj, id) => {
        for (let key in obj) {
            if (id === obj[key].id) {
                return obj[key].attributes.uri.url;
            }
        }
    };


    /**
     * buildAuthorList.
     * get list of all available authors.
     *
     * @param {obj} obj  all blogposts object
     *
     * @return {array} all available authors
     */
    const buildAuthorList = (obj) => {
        let availableAuthors = [];
        // build an array of all available images
        obj.included.forEach(function (element) {
            if (element.type === "node--blog_author") {
                availableAuthors.push(element);
            }
        });
        
        return availableAuthors;
    };


    /**
     * getBlogAuthor.
     * get the author(s) of a blogpost.
     * blogAuthors looks like this:
     *  [
     *      {
     *          "type": "node--blog_author",
     *          "id": "4dacea24-11b1-4dc7-9d9a-79696d12c0da"
     *      },
     *      {
     *          "type": "node--blog_author",
     *          "id": "33e9cde6-40f1-41fb-8a7a-7a825abf9671"
     *      }
     *  ]
     *
     * allAuthors looks like this:
     *  [
     *      {
     *          type: 'node--blog_author',
     *          id: '4dacea24-11b1-4dc7-9d9a-79696d12c0da',
     *          attributes:
     *          { 
     *              title: 'Cloe Turnshoe',
     *              field_author_affiliation: [Object],
     *              field_position: [Object] },
     *              relationships: { field_avatar: [Object] },
     *              links: ...
     *          },
     *          { 
     *              type: 'node--blog_author',
     *              id: '33e9cde6-40f1-41fb-8a7a-7a825abf9671',
     *              attributes: ...
     *           },
     *           ...
     *      }
     *  ]
     * @param {obj} allAuthors    the allAuthors obj
     * @param {obj} blogAuthors   the blog author(s)
     *
     * @return {obj} author(s) of the blogpost
     */
    const getBlogAuthor = (allAuthors, blogAuthors) => {
        let temp = {};
        for (let authorIndex in allAuthors) {
            for (let blogAuthorIndex in blogAuthors ) {
                if (blogAuthors[blogAuthorIndex].id === allAuthors[authorIndex].id) {
                     temp[blogAuthors[blogAuthorIndex].id] = {
                        name: allAuthors[authorIndex].attributes.title,
                        position: allAuthors[authorIndex].attributes.field_position.value,
                        affiliation: allAuthors[authorIndex].attributes.field_author_affiliation.value,
                        avatarID: allAuthors[authorIndex].relationships.field_avatar.data.id
                    }
                }
            }
        }
        return temp;
    };


    /**
     * getBlogAuthorProfile.
     * get the complete blogpost author(s) profile including their avatar
     *
     * @param {obj}    allBlogpostsObj
     * @param {string} blogpostID
     *
     * @return {obj} author(s) profile
     */
    const getBlogAuthorProfile = (allBlogpostsObj, blogpostID) => {

        // get the author ID(s) for this blogpost
        // authors are represented in blogposts as relationships
        // in the blogpost only an author ID is available in the relationship obj
        let foundAuthorIDs = [];

        for (let blogpostIndex in allBlogpostsObj.data) {         
            if (allBlogpostsObj.data[blogpostIndex].id === blogpostID) {
                let authorsRelationshipData = allBlogpostsObj.data[blogpostIndex].relationships.field_blog_author.data;
                for (let authorIndex in authorsRelationshipData) {
                    foundAuthorIDs[authorIndex] = authorsRelationshipData[authorIndex].id
                }
            }
        }
        // at this point we have the author IDs in array foundAuthorIDs

        // get basic authors data
        let foundAuthors = {};
        // for every member of the included object we'll loop over the foundAuthorsIDs array to find a match
        for (let authorIndex in allBlogpostsObj.included) {
            for (let foundAuthorIndex in foundAuthorIDs) {
                if (allBlogpostsObj.included[authorIndex].id === foundAuthorIDs[foundAuthorIndex]) {
                    foundAuthors[allBlogpostsObj.included[authorIndex].id] = {
                        title : allBlogpostsObj.included[authorIndex].attributes.title,
                        affiliation : allBlogpostsObj.included[authorIndex].attributes.field_author_affiliation.value,
                        position : allBlogpostsObj.included[authorIndex].attributes.field_position.value,
                        avatarID : allBlogpostsObj.included[authorIndex].relationships.field_avatar.data.id,
                        avatarURL : ''
                    }
                }
            }
        }
        // at this point we have the authors object with the avatarID

        // now we need to exchange the avatarURL for the avatarsIDs
        for (let avatarIndex in allBlogpostsObj.included) {
            for (let foundAuthorsIndex in foundAuthors) {
                if (allBlogpostsObj.included[avatarIndex].id === foundAuthors[foundAuthorsIndex].avatarID) {
                    // download the image to the local assets folder
                    const imageURL = allBlogpostsObj.serverURL + allBlogpostsObj.included[avatarIndex].attributes.uri.url;
                    const targetDir = "/assets/images/blog/";
                    const imageName = getImage(imageURL, targetDir);

                    foundAuthors[foundAuthorsIndex].avatarURL = targetDir + imageName;
                    delete foundAuthors[foundAuthorsIndex].avatarID
                }
            }
        }
        return foundAuthors;
    };


    /**
     * getCategories.
     * get a list of all categories for blogposts.
     *
     * @param {obj}    obj        all blogpost objects
     * @param {string} taxonomy   the name of the taxonomy field, e.g. 'field_blog_tags' or 'field_blog_category' 
     *
     * @return {array} categories for all blogposts
     */
    const getCategories = (obj, taxonomy) => {
        let categories = [];
        let temp = {};
        obj.included.forEach( function (element) {
            temp = {};
            if (element.type === taxonomy) {
                temp.id = element.attributes.uuid;
                temp.name = element.attributes.name;
                categories.push(temp);
            }
        });
        return categories.sort();
    };


    /**
     * getBlogCategories.
     * get the categories for this blogpost
     *
     * @param {obj}     objAll      all blogpost objects
     * @param {obj}     obj         this blogpost object
     * @param {string}  taxonomy    the name of the taxonomy field, e.g. 'field_blog_tags' or 'field_blog_category'
     *
     * @return {array}  categories for this blogpost
     */
    const getBlogCategories = (objAll, obj, taxonomy) => {
        let categories = [];
        let allCategories = getCategories(objAll, obj.relationships[taxonomy].data[0].type);

        // build an array of category ids for this blogpost
        obj.relationships[taxonomy].data.forEach( function (element, index) {
            categories[index] = element.id;
        });

        // replace the category id with the category name
        // loop over all categories
        let temp = [];
        // loop over allCategories and check if a key matches
        // a key in the categories array
        for ( let item of Object.keys(allCategories)) {
            categories.forEach(function (category) {
                // build a temp categories array with array names
                if (category === allCategories[item].id) {
                    temp.push(allCategories[item].name);
                }
            });
        }
        // swap categories ids with names
        categories = temp;

        return categories.sort();
    };

    /**
     * getInlineImages
     * get all inline image URLs, download them and store them in targetDir and change image sources to targetDir
     * 
     * @param {string} content     the blogpost body
     * @param {string} remotePath  
     * @param {string} targetDir   target directory path
     * 
     * @return {string} blogpost body with local image sources
     */
    const getInlineImages = (content, remotePath, targetDir) => {
        // extract a image source urls 
        const $ = cheerio.load(content);
        const imgSources = [];
        $('img').each(function (index, element) {
            imgSources.push($(element).attr('src'));
        });
        // download the images
        for (let i = 0; imgSources.length > i; i++) {
            const imageURL = imgSources[i];
            const targetDir = "/assets/images/blog/";
            getImage(imageURL, targetDir);
        }
        // switch the image src to the local ones
        const oldPath = new RegExp(remotePath, 'g');
        const processedContent = content.replace(oldPath, targetDir);

        return processedContent;
    };


    return (files, metalsmith, done) => {

        const serverUrl = "http://dev-orca.pantheonsite.io";
        const page = "/jsonapi/node/blogpost";
        const orcaRequest = getBlogPostsQuery(serverUrl, page);
        const contentDirectory = process.cwd() + "/dev/content/";
        const blogDirectory = contentDirectory + "blog/";
        const dataDirectory = contentDirectory + "data/";
        let blogpostMetaData = [];

        // get data from the ORCA server API
        request.get(orcaRequest, function (error, response, data) {
            if (error) {
                return console.dir(error);
            }
            // parse json into js object
            const blogPostsObj = JSON.parse(data);
            // add serverURL to the page object to be used in support functions
            blogPostsObj.serverURL = serverUrl;

            const allImages = buildImageList(blogPostsObj);
            const allAuthors = buildAuthorList(blogPostsObj);
            let blogpostSummary = {};
            let temp = {};

            blogPostsObj.data.forEach(function (blogpost) {
                // build blogpost metadata to be used on home page blog section
                temp = {};
                temp.blogTitle = blogpost.attributes.title;
                temp.blogIsFeatured = blogpost.attributes.field_blog_is_featured;
                temp.blogDate = blogpost.attributes.field_blog_date;
                temp.blogURL = blogpost.attributes.title.replace(/\.$/, "").replace(/\s+/g, '-').toLowerCase();
                //temp.blogTn = blogPostsObj.serverURL + getBlogTn(allImages, blogpost.relationships.field_blog_thumbnail.data.id);

                // download the image to the local assets folder
                const imageURL = blogPostsObj.serverURL + getBlogTn(allImages, blogpost.relationships.field_blog_thumbnail.data.id);
                const targetDir = "/assets/images/blog/";
                const imageName = getImage(imageURL, targetDir);

                temp.blogTn = targetDir + imageName;

                //temp.blogAuthor = getBlogAuthor(allAuthors, blogpost.relationships.field_blog_author.data);
                //temp.blogAuthor.avatarURL = blogPostsObj.serverURL + getBlogTn(allImages, temp.blogAuthor.avatarID);
                temp.blogCategories = getBlogCategories(blogPostsObj, blogpost, "field_blog_category");
                temp.blogTags = getBlogCategories(blogPostsObj, blogpost, "field_blog_tags");
                temp.blogAuthors = getBlogAuthorProfile(blogPostsObj, blogpost.id);

                // extract inline-image info from body and download images
                let processedBody = getInlineImages(blogpost.attributes.body.value, serverUrl + "/sites/default/files/blogpost-images/", targetDir);

                // replace any trailing dot, convert spaces to dashes and lower case.
                // key for the files array
                const fileName = "blog/" + blogpost.attributes.title.replace(/\.$/, "").replace(/\s+/g, '-').toLowerCase() + ".html";
                // value for the files array
                const page = {
                    type: "blogpost",
                    layout: "default-blogpost.html",
                    title: blogpost.attributes.title,
                    collection: "blog",
                    description: blogpost.attributes.body.summary,
                    page_classes: "blogpost",
                    contents: new Buffer(processedBody),
                    tn: temp.blogTn,
                    date: temp.blogDate,
                    tags: temp.blogTags,
                    categories: temp.blogCategories,
                    blogAuthors : temp.blogAuthors
                }

                // add page to metalsmith object
                files[fileName] = page;

                // add blogpost metadata to blogpostSummary
                blogpostSummary[blogpost.id] = temp;
            });

            // add blogpostSummary variables to the metalsmith metadata
            let metadata = metalsmith.metadata();
            metadata.blogpostSummary = blogpostSummary;
            metalsmith.metadata(metadata);

            done();
        });
    };
}

module.exports = plugin;