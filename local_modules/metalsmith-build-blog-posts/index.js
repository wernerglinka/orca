/*global __dirname, require, console, module, plugin, metalsmith, setImmediate, error, response, data, process, writeFileSync*/
/*jslint for:true*/

const request = require('request');
const fs = require('fs');
const findFolder = require('node-find-folder');
const path = require('path');
const commonTags = require('common-tags');


/**
 * Metalsmith plugin to prepare a yml data file from api data
 */
function plugin() {
    'use strict';

    const getBlogPostsQuery = (serverURL, page) => {
        const query = commonTags.oneLineTrim`?_format=json
            &fields[node--blogpost]=title,
                body,
                field_blog_date,
                field_blog_author,
                field_blog_thumbnail
            &fields[node--blog_author]=title,
                field_position,
                field_author_affiliation,
                field_avatar
            &field[file--file]=uri
            &include=field_blog_author,
                field_blog_thumbnail,
                field_blog_author.field_avatar`;
        return serverURL + page + query;
    };

    // images are included via a node relationship to the image file
    // we first build an array of all available images in the response json
    // later we can search all node relationships for the file name and when found
    // we'll find the url of the image
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

    const getBlogTn = (obj, id) => {
        for (let key in obj) {
            if (id === obj[key].id) {
                return obj[key].attributes.uri.url;
            }
        }
    };

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

    const getBlogAuthor = (obj, id) => {
        let temp = {};
        for (let key in obj) {
            if (id === obj[key].id) {
                return {
                    name: obj[key].attributes.title,
                    position: obj[key].attributes.field_position.value,
                    affiliation: obj[key].attributes.field_author_affiliation.value,
                    avatarID: obj[key].relationships.field_avatar.data.id
                }
            }
        }
    };


    return function (files, metalsmith, done) {
        setImmediate(done);

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
            // add serverURL to the page object, we'll need it in some support functions
            blogPostsObj.serverURL = serverUrl;

            const allImages = buildImageList(blogPostsObj);
            const allAuthors = buildAuthorList(blogPostsObj);
            //const allAuthorAvatars = buildAuthorAvatarList(blogPostsObj);
            let blogpostSummary = {};
            let temp = {};

            blogPostsObj.data.forEach(function (blogpost) {
                temp = {};
                temp.blogTitle = blogpost.attributes.title;
                temp.blogDate = blogpost.attributes.field_blog_date;
                temp.blogURL = blogpost.attributes.title.replace(/\.$/, "").replace(/\s+/g, '-').toLowerCase();
                temp.blogTn = getBlogTn(allImages, blogpost.relationships.field_blog_thumbnail.data.id);
                temp.blogAuthor = getBlogAuthor(allAuthors, blogpost.relationships.field_blog_author.data.id);
                temp.blogAuthor.avatarURL = blogPostsObj.serverURL + getBlogTn(allImages, temp.blogAuthor.avatarID);
                
                // replace any trailing dot, convert spaces to dashes and lower case.
                const fileName = blogpost.attributes.title.replace(/\.$/, "").replace(/\s+/g, '-').toLowerCase() + ".njk";
                const fileContent = commonTags.html`
                    ---
                    layout: blog-page.html
                    title: ${blogpost.attributes.title}
                    description: ${blogpost.attributes.body.summary}
                    page_class: blogpost
                    blogpost_date: ${blogpost.attributes.field_blog_date}
                    ---

                    {% extends "layouts/default-blogpost.html" %}

                    {% block blogpost_body %}
                    <h1>${blogpost.attributes.title}</h1>
                    <p class="blog-date">
                        {{ blogpost_date | dateFilter("MMMM D, YYYY") }}
                    </p>
                    <div class='blogpost-content'>
                        ${blogpost.attributes.body.value}
                    </div>
                    {% endblock %}
                    
                    {% block blogpost_sidebar %}
                    <div class="blog-author-avatar">
                        <img src="${temp.blogAuthor.avatarURL}" alt="" />
                    </div>
                    <p class="blog-author">
                        ${temp.blogAuthor.name}
                    </p>
                    <p class="blog-author-position">
                        ${temp.blogAuthor.position}
                    </p>
                    <p class="blog-author-affiliation">
                        ${temp.blogAuthor.affiliation}
                    </p>

                    {% endblock %}
                    `;

                // write the blogpost file
                fs.writeFileSync(blogDirectory + fileName, fileContent, function (err) {
                    if (err) {
                        console.log(err);
                    }
                });

                // add blogpost metadata to blogpostSummary
                blogpostSummary[blogpost.id] = temp;
            });

            // build the blogpost summary meta data file: /dev/content/data/blogpost.json
            fs.writeFile(dataDirectory + "blogposts.json", JSON.stringify(blogpostSummary), function (err) {
                if (err) {
                    console.log(err);
                }
                done();
            });

        });
    };
}

module.exports = plugin;