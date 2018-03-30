/*global __dirname, require, console, module, plugin, metalsmith, setImmediate, error, response, data, process*/
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


    const getHomePageDataQuery = (serverURL, page) => {
        const query = commonTags.oneLineTrim`?_format=api_json
            &filter[titleFilter][condition][path]=title
            &filter[titleFilter][condition][value]=Orca Home Global
            &fields[node--home_page]=field_site_name,
                field_welcome_text,
                field_welcome_bg_img,
                field_about_title,
                field_about_byline,
                field_about_prose_1_header,
                field_about_prose,
                field_about_prose_2_header,
                field_about_prose_2,
                field_about_image,
                field_testimonials,
                field_service_title,
                field_service_byline,
                field_service_image,
                field_our_services
            &fields[node--testimonials]=body,
                field_author,
                field_title,
                field_affiliation
            &fields[node--services]=body,
                field_service_provided,
                field_service_thumbnail,
            &include=field_welcome_bg_img,
                field_about_image,
                field_testimonials,
                field_service_image,
                field_our_services,
                field_our_services.field_service_thumbnail`;
        return serverURL + page + query;
    };


    // function to get the field value from node and related enties
    // the json api bundles then as attributes and relationships
    // Assumption:
    // all text fields are setup as Text (formatted)
    const getValue = (obj, id, field_name, para) => {
        if (para === 'attr') {
            return obj.data[id].attributes[field_name].value;
        }
        if (para === "rel") {
            return obj.included[id].attributes[field_name];
        }
        return false;
    };


    const getAllTestimonials = (homePageObj) => {
        const testimonials = [];
        const processedTestimonials = [];

        // separate testimonials from the rest of the obj
        homePageObj.included.forEach(function (element) {
            if (element.type === "node--testimonials") {
                const thisElement = element.attributes;
                let temp = {};
                for ( let item of Object.keys(thisElement)) {
                    for ( let prop in thisElement[item]) {
                        if(prop === 'value') {
                            temp[item] = thisElement[item]['value'];
                        }
                    }
                }
                testimonials.push(temp);
            }
        });
        return testimonials;
    };


    const getAllServices = (homePageObj) => {
        const services = [];
        const processedServices = [];
        const availableImages = [];

        // separate testimonials from the rest of the obj
        homePageObj.included.forEach(function (element) {
            if (element.type === "node--services") {
                const thisElement = element.attributes;

                // each element object has 'value', 'format' and 'processed' properties
                // simplify element by only keeping the 'value'
                // for example:
                //   "field_service_provided": {
                //       "value": "Contemplating",
                //       "format": "basic_html",
                //       "processed": "Contemplating"
                //   }
                //   will become:
                //  "field_service_provided": "Contemplating"
                let temp = {};
                for ( let item of Object.keys(thisElement)) {
                    for ( let prop in thisElement[item]) {
                        if(prop === 'value') {
                            temp[item] = thisElement[item]['value'];
                        }
                    }
                }
                // add the relationship image tn
                temp['image_tn'] = element.relationships.field_service_thumbnail.data.id;
                services.push(temp);
            }
            if (element.type === "file--file") {
                availableImages.push(element.attributes);
            }
        });

        // replace the image id with the url in image_tn
        services.forEach(function (element) {
            availableImages.forEach(function (thisImage){
                if (element.image_tn === thisImage.uuid) {
                    element.image_tn = homePageObj.serverURL + thisImage.uri.url;
                }
            });
        });
        return services;
    };


    return function (files, metalsmith, done) {
        setImmediate(done);

        const serverUrl = "http://dev-orca.pantheonsite.io";
        const page = "/jsonapi/node/home_page";
        const orcaRequest = getHomePageDataQuery(serverUrl, page);
        const contentDirectory = process.cwd() + "/dev/content/";
        const dataDirectory = contentDirectory + "data/";

        // get data from the ORCA server API
        request.get(orcaRequest, function (error, response, data) {
            if (error) {
                return console.dir(error);
            }
            // parse json into js object
            const homePageObj = JSON.parse(data);
            // add serverURL to the page object, we'll need it in some support functions
            homePageObj.serverURL = serverUrl;

            let homePage = {};

            // get the fields for the welcome section
            homePage.siteName = getValue(homePageObj, 0, "field_site_name", "attr") || ""; // Text (formatted)
            homePage.welcomeText = getValue(homePageObj, 0, "field_welcome_text", "attr") || ""; // Text (Plain)
            homePage.bgImageSource = serverUrl + (getValue(homePageObj, 8, "url", "rel") || ""); // Image
            // get the fields for the about section
            homePage.aboutTitle = getValue(homePageObj, 0, "field_about_title", "attr") || ""; // Text (formatted)
            homePage.aboutByline = getValue(homePageObj, 0, "field_about_byline", "attr") || ""; // Text (formatted)
            homePage.aboutProse1Header = getValue(homePageObj, 0, "field_about_prose_1_header", "attr") || ""; // Text (formatted)
            homePage.aboutProse1 = getValue(homePageObj, 0, "field_about_prose", "attr") || ""; // Text (formatted)
            homePage.aboutProse2Header = getValue(homePageObj, 0, "field_about_prose_2_header", "attr") || ""; // Text (formatted)
            homePage.aboutProse2 = getValue(homePageObj, 0, "field_about_prose_2", "attr") || ""; // Text (formatted)
            homePage.aboutImageSource = serverUrl + (getValue(homePageObj, 0, "url", "rel") || ""); // Image
            homePage.testimonials = getAllTestimonials(homePageObj); // Array of all testimonials
            // get the fields for the services section
            homePage.servicesTitle = getValue(homePageObj, 0, "field_service_title", "attr") || ""; // Text (formatted)
            homePage.servicesByline = getValue(homePageObj, 0, "field_service_byline", "attr") || ""; // Text (formatted)
            homePage.servicesImageSource = serverUrl + (getValue(homePageObj, 4, "url", "rel") || ""); // Image
            homePage.ourServices = getAllServices(homePageObj); // Array of all services

            // write the fields to the home-page data file
            fs.writeFile(dataDirectory + "home-page.json", JSON.stringify(homePage), function (err) {
                if (err) {
                    console.log(err);
                }
                console.log('\n >>>> Homepage has been rebuild \n');
                done();
            });
        });
    };
}

module.exports = plugin;