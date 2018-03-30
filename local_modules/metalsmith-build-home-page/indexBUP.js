/*global __dirname, require, console, module, plugin, metalsmith, setImmediate, error, response, data*/
/*jslint vars:true*/

const request = require('request');
const fs = require('fs');
const findFolder = require('node-find-folder');
const path = require('path');
const commonTags = require('common-tags');
const stripTags = require('stripTags');

/**
 * Metalsmith plugin to create the home page from orce server (drupal8 decoupled)
 */
function plugin() {
    'use strict';


    // function to get the field value from node and related enties
    // the json api bundles then as attributes and relationships
    // Assumption:
    // text fields are setup as Text (formatted)
    var getValue = function (obj, id, field_name, para) {
        if (para === 'attr') {
            return obj.data[id].attributes[field_name].value;
        }
        if (para === "rel") {
            return obj.included[id].attributes[field_name];
        }
        return false;
    };

    return function (files, metalsmith, done) {
        setImmediate(done);

        //http://dev-orca.pantheonsite.io/jsonapi/node/home_page?_format=api_json&filter[titleFilter][condition][path]=title&filter[titleFilter][condition][value]=Orca Home Global&fields[node--home_page]=field_site_name,field_welcome_text,field_welcome_bg_img,field_about_title,field_about_byline,field_about_prose,field_about_image&include=field_welcome_bg_img,field_about_image,field_testimonials&fields[file--file]=url



        // build the query
        const serverUrl = "http://dev-orca.pantheonsite.io";
        const page = "/jsonapi/node/home_page";
        const query = commonTags.oneLineTrim`?_format=api_json
          &filter[titleFilter][condition][path]=title
          &filter[titleFilter][condition][value]=Orca Home Global
          &fields[node--home_page]=field_site_name,field_welcome_text,field_welcome_bg_img,field_about_title,field_about_byline,field_about_prose
          &include=field_welcome_bg_img&fields[file--file]=url`;
        const orcaRequest = serverUrl + page + query;
        const pageDirectory = process.cwd() + "/dev/content/";

        // get data from the ORCA server API
        request.get(orcaRequest, function (error, response, data) {
            if (error) {
                return console.dir(error);
            }
            // parse json into js object
            const homePageObj = JSON.parse(data);

            //console.log(homePageObj);

            // example object
            /*
            {
                "data": [
                    {
                        "type": "node--home_page",
                        "id": "8ee7074a-2c7b-4f26-88ab-03242d5098f8",
                        "attributes": {
                            "field_site_name": {
                                "value": "ORCA",
                                "format": "basic_html",
                                "processed": "ORCA"
                            },
                            "field_welcome_text": {
                                "value": "If you are looking for an <strong>example</strong> of a decoupled Drupal 8 site feeding content to a Metalsmith build process, you have come to the right place.",
                                "format": "basic_html",
                                "processed": "If you are looking for an <strong>example</strong> of a decoupled Drupal 8 site feeding content to a Metalsmith build process, you have come to the right place."
                            }
                        },
                        "relationships": {
                            "field_welcome_bg_img": {
                                "data": {
                                    "type": "file--file",
                                    "id": "5b9d39e1-df86-4bda-9baa-9993397a7713",
                                    "meta": {
                                        "alt": "",
                                        "title": "",
                                        "width": "1920",
                                        "height": "1200"
                                    }
                                },
                                "links": {
                                    "self": "http://dev-orca.pantheonsite.io/jsonapi/node/home_page/8ee7074a-2c7b-4f26-88ab-03242d5098f8/relationships/field_welcome_bg_img",
                                    "related": "http://dev-orca.pantheonsite.io/jsonapi/node/home_page/8ee7074a-2c7b-4f26-88ab-03242d5098f8/field_welcome_bg_img"
                                }
                            }
                        },
                        "links": {
                            "self": "http://dev-orca.pantheonsite.io/jsonapi/node/home_page/8ee7074a-2c7b-4f26-88ab-03242d5098f8"
                        }
                    }
                ],
                "jsonapi": {
                    "version": "1.0",
                    "meta": {
                        "links": {
                            "self": "http://jsonapi.org/format/1.0/"
                        }
                    }
                },
                "links": {
                    "self": "http://dev-orca.pantheonsite.io/jsonapi/node/home_page?_format=api_json&filter%5BtitleFilter%5D%5Bcondition%5D%5Bpath%5D=title&filter%5BtitleFilter%5D%5Bcondition%5D%5Bvalue%5D=Orca%20Home%20Global&fields%5Bnode--home_page%5D=field_site_name%2Cfield_welcome_text%2Cfield_welcome_bg_img&fields%5Bfile--file%5D=url&include=field_welcome_bg_img"
                },
                "included": [
                    {
                        "type": "file--file",
                        "id": "5b9d39e1-df86-4bda-9baa-9993397a7713",
                        "attributes": {
                            "url": "/sites/default/files/home-page/fullscreen_image.jpg"
                        },
                        "links": {
                            "self": "http://dev-orca.pantheonsite.io/jsonapi/file/file/5b9d39e1-df86-4bda-9baa-9993397a7713"
                        }
                    }
                ]
            }
            */

            // get the fields
            const siteName = getValue(homePageObj, 0, "field_site_name", "attr") || ""; // Text (formatted)
            const welcomeText = getValue(homePageObj, 0, "field_welcome_text", "attr") || ""; // Text (Plain)
            const bgImageSource = serverUrl + (getValue(homePageObj, 0, "url", "rel") || ""); // Image

            const aboutTitle = getValue(homePageObj, 0, "field_about_title", "attr") || ""; // Text (formatted)
            const aboutByline = getValue(homePageObj, 0, "field_about_byline", "attr") || ""; // Text (formatted)
            var aboutProse = getValue(homePageObj, 0, "field_about_prose", "attr") || ""; // Text (formatted)

            console.log(aboutProse);


            //console.log(aboutTitle);


            // build the home page
            const filePath = pageDirectory + "index.njk";
            const fileContent = commonTags.html`
                ---
                title: This is the index page
                layout: default-page.html
                ---
                {% extends "layouts/default-page.html" %}

                {% block welcome_section %}
                <section class="welcome-section">
                    <div class="welcome-section__header" style="background-image: url(${bgImageSource})">
                        <h1>${siteName}</h1>
                    </div>
                    <p class="welcome-section__text">${welcomeText}</p>
                </section>
                {% endblock %}
                {% block about_section %}
                <section class="about-section">
                    <h1>${aboutTitle}</h1>
                    <p class="about-section__text">${aboutByline}</p>
                    <div>
                        ${aboutProse}
                    </div>
                </section>
                {% endblock %}
                `;

            try {
                fs.writeFileSync(filePath, fileContent);
            } catch (e) {
                console.log("Cannot write file ", e);
            }
            done();
        });
    };
}

module.exports = plugin;