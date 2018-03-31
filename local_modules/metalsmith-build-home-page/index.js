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
                field_our_services,
                field_projects_title,
                field_projects_byline,
                field_projects
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
                field_our_services.field_service_thumbnail,
                field_projects,
                field_projects.field_project_image`;
        return serverURL + page + query;
    };

    // get field value of text fields and the url of image fields
    // an example response object can be found in site-notes/response-example.json
    const getFieldValue = (obj, field_name) => {
        let fieldValue = '';
        let relID = "";
        let nodeAttributes = obj.data[0].attributes;
        let nodeRelationships = obj.data[0].relationships;
        let availableImages = [];

        // first loop over the node attributes
        for ( let item of Object.keys(nodeAttributes)) {
            if ( item === field_name) {
                return nodeAttributes[item].value;
            }
        }

        // images are included via a node relationship to the image file
        // we first build an array of all available images in the respionse json
        // then we search all node relationships for the file name and when found
        // we'll find the url of the image

        // build an array of all available images
        obj.included.forEach(function (element) {
            if (element.type === "file--file") {
                availableImages.push(element.attributes);
            }
        });

        // if the field name was not found in the attributes we'll loop over the included relationship fields
        for ( let item of Object.keys(nodeRelationships)) {
            if ( item === field_name) {
                // find the id of the image
                relID = nodeRelationships[item].data.id;

                // return the image url if the uudi matches the relID
                for (let index in availableImages) {
                    if (availableImages[index].uuid === relID) {
                        return obj.serverURL + availableImages[index].uri.url;
                    }
                }
            }
        }
        // if we didn't find any match we'll log an error
        console.log('\n >>>> No file name match in either attributes nor oncluded relationships of the api response \n');
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

    const getAllProjects = (homePageObj) => {
        const projects = [];
        const availableImages = [];

        // separate testimonials from the rest of the obj
        homePageObj.included.forEach(function (element) {
            // find all projects
            if (element.type === "node--projects") {
                const thisElement = element.attributes;

                let temp = {};
                for ( let item of Object.keys(thisElement)) {
                    for ( let prop in thisElement[item]) {
                        if(prop === 'value') {
                            temp[item] = thisElement[item]['value'];
                        }
                    }
                }
                // add the relationship image tn
                temp['image_tn'] = element.relationships.field_project_image.data.id;
                projects.push(temp);
            }
            if (element.type === "file--file") {
                availableImages.push(element.attributes);
            }
        });

        // replace the image id with the url in image_tn
        projects.forEach(function (element) {
            availableImages.forEach(function (thisImage){
                if (element.image_tn === thisImage.uuid) {
                    element.image_tn = homePageObj.serverURL + thisImage.uri.url;
                }
            });
        });
        return projects;
    };

    const getCategories = (obj, categories_field) => {
        let temp = "";
        let categories = [];
        obj.forEach( function (thisCategoryField) {
            temp += " " + thisCategoryField[categories_field];
        });
        // turn string into array and remove duplicates 
        categories = [ ...new Set(temp.trim().split(" ")) ];

        return categories.sort();
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
            homePage.siteName = getFieldValue(homePageObj, "field_site_name") || ""; // Text (formatted)
            homePage.welcomeText = getFieldValue(homePageObj,"field_welcome_text") || ""; // Text (Plain)
            homePage.bgImageSource = getFieldValue(homePageObj,"field_welcome_bg_img") || ""; // Image
            // get the fields for the about section
            homePage.aboutTitle = getFieldValue(homePageObj, "field_about_title") || ""; // Text (formatted)
            homePage.aboutByline = getFieldValue(homePageObj, "field_about_byline") || ""; // Text (formatted)
            homePage.aboutProse1Header = getFieldValue(homePageObj, "field_about_prose_1_header") || ""; // Text (formatted)
            homePage.aboutProse1 = getFieldValue(homePageObj, "field_about_prose") || ""; // Text (formatted)
            homePage.aboutProse2Header = getFieldValue(homePageObj, "field_about_prose_2_header") || ""; // Text (formatted)
            homePage.aboutProse2 = getFieldValue(homePageObj, "field_about_prose_2") || ""; // Text (formatted)
            homePage.aboutImageSource = getFieldValue(homePageObj, "field_about_image") || ""; // Image
            homePage.testimonials = getAllTestimonials(homePageObj); // Array of all testimonials
            // get the fields for the services section
            homePage.servicesTitle = getFieldValue(homePageObj, "field_service_title") || ""; // Text (formatted)
            homePage.servicesByline = getFieldValue(homePageObj, "field_service_byline") || ""; // Text (formatted)
            homePage.servicesImageSource = getFieldValue(homePageObj, "field_service_image") || ""; // Image
            homePage.ourServices = getAllServices(homePageObj); // Array of all services
            // get the fields for the projects section
            homePage.projectsTitle = getFieldValue(homePageObj, "field_projects_title") || ""; // Text (formatted)
            homePage.projectsByline = getFieldValue(homePageObj, "field_projects_byline") || ""; // Text (formatted)
            homePage.projects = getAllProjects(homePageObj); // Array of all services
            homePage.projectsCategories = getCategories(homePage.projects, "field_project_categories"); // Array of categories

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