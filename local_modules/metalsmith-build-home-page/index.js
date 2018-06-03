/*global __dirname, require, console, module, plugin, metalsmith, setImmediate, error, response, data, process*/
/*jslint for:true*/

const request = require('request');
const fs = require('fs');
const http = require('http');
const findFolder = require('node-find-folder');
const path = require('path');
const commonTags = require('common-tags');
const getImage = require('get-image');

/**
 * Metalsmith plugin to build the home page from api data
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
                field_projects,
                field_project_postamble,
                field_blog_title,
                field_blog_byline,
                field_blog_image,
                field_contact_title,
                field_contact_byline,
                field_contact_image,
                field_contact_address_header,
                field_contact_street,
                field_contact_city,
                field_contact_state,
                field_contact_postal_code,
                field_contact_email_header,
                field_contact_email,
                field_contact_phone_header,
                field_contact_phone,
                field_twitter,
                field_facebook,
                field_linkedin
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
                field_projects.field_project_image,
                field_projects.field_project_categories,
                field_blog_image,
                field_contact_image`;
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
                if (item === 'field_contact_email' || item === 'field_contact_phone') {
                    return nodeAttributes[item];
                }
                return nodeAttributes[item].value;
            }
        }

        // images are included via a node relationship to the image file
        // we first build an array of all images that are available in the response json
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

                        // download the image to the local assets folder
                        const imageURL = obj.serverURL + availableImages[index].uri.url;
                        const targetDir = "/assets/images/homepage/";
                        const imageName = getImage(imageURL, targetDir);

                        return targetDir + imageName;
                    }
                }
            }
        }
        // if we didn't find any match we'll log an error
        console.log('\n >>>> No file name match in neither attributes nor included relationships of the api response \n');
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
                    // download the image to the local assets folder
                    const imageURL = homePageObj.serverURL + thisImage.uri.url;
                    const targetDir = "/assets/images/services/";
                    const imageName = getImage(imageURL, targetDir);

                    element.image_tn = targetDir + imageName;
                }
            });
        });
        return services;
    };

    const getAllProjects = (homePageObj) => {
        const projects = [];
        const availableImages = [];
        const allCategories = [];

        // separate projects from the rest of the obj
        homePageObj.included.forEach(function (element) {
            // find all projects
            if (element.type === "node--projects") {
                const thisElement = element.attributes;

                let temp = {};
                let tempCat = [];
                for ( let item of Object.keys(thisElement)) {
                    for ( let prop in thisElement[item]) {
                        if(prop === 'value') {
                            temp[item] = thisElement[item]['value'];
                        }
                    }
                }
                // add the relationship image tn to the project array
                temp['image_tn'] = element.relationships.field_project_image.data.id;
                // add the project categories to the project array
                tempCat = [];
                element.relationships.field_project_categories.data.forEach(function (thisCategory) {
                    tempCat.push(thisCategory.id);
                });
                temp['categories'] = tempCat;
                // add this project to projects
                projects.push(temp);
            }
            if (element.type === "file--file") {
                availableImages.push(element.attributes);
            }
            if (element.type === "taxonomy_term--project_categories") {
                let thisCategoryID = element.id;
                let thisCategoryName = element.attributes.name;
                allCategories[thisCategoryID] = thisCategoryName;
            }
        });

        // replace the image id with the url in image_tn
        projects.forEach(function (element) {
            availableImages.forEach(function (thisImage){
                if (element.image_tn === thisImage.uuid) {
                    // download the image to the local assets folder
                    const imageURL = homePageObj.serverURL + thisImage.uri.url;
                    const targetDir = "/assets/images/projects/";
                    const imageName = getImage(imageURL, targetDir);

                    element.image_tn = targetDir + imageName;;
                }
            });
        });

        // replace the category id with the category name
        // loop over all projects
        projects.forEach(function (project) {
            let temp = [];
            // loop over allCategories and check if a key matches
            // a key in the project.categories array
            for ( let item of Object.keys(allCategories)) {
                project.categories.forEach(function (thisProjectCategory) {
                    // build a temp categories array with array names
                    if (thisProjectCategory === item) {
                        temp.push(allCategories[item]);
                    }
                });
            }
            // swap categories ids with names
            project.categories = temp;
        });
        return projects;
    };

    const getCategories = (obj) => {
        let categories = [];
        obj.included.forEach( function (element) {
            if (element.type === "taxonomy_term--project_categories") {
                categories.push(element.attributes.name);
            }
        });
        return categories.sort();
    };

    return (files, metalsmith, done) => {

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
            homePage.projectsPostamble = getFieldValue(homePageObj, "field_project_postamble") || ""; // Text (formatted)
            homePage.projects = getAllProjects(homePageObj); // Array of all services
            homePage.projectsCategories = getCategories(homePageObj); // Array of categories
            // get the fields for the blog section
            homePage.blogTitle = getFieldValue(homePageObj, "field_blog_title") || ""; // Text (formatted)
            homePage.blogByline = getFieldValue(homePageObj, "field_blog_byline") || ""; // Text (formatted)
            homePage.blogImageSource = getFieldValue(homePageObj, "field_blog_image") || ""; // Image
            // get the fields for the contact section
            homePage.contactTitle = getFieldValue(homePageObj, "field_contact_title") || ""; // Text (formatted)
            homePage.contactByline = getFieldValue(homePageObj, "field_contact_byline") || ""; // Text (formatted)
            homePage.contactImageSource = getFieldValue(homePageObj, "field_contact_image") || ""; // Image
            homePage.contactAddressHeader = getFieldValue(homePageObj, "field_contact_address_header") || ""; // Text (formatted)
            homePage.contactStreet = getFieldValue(homePageObj, "field_contact_street") || ""; // Text (formatted)
            homePage.contactCity = getFieldValue(homePageObj, "field_contact_city") || ""; // Text (formatted)
            homePage.contactState = getFieldValue(homePageObj, "field_contact_state") || ""; // Text (formatted)
            homePage.contactPostalCode = getFieldValue(homePageObj, "field_contact_postal_code") || ""; // Text (formatted)
            homePage.contactPhoneHeader = getFieldValue(homePageObj, "field_contact_phone_header") || ""; // Text (formatted)
            homePage.contactPhone = getFieldValue(homePageObj, "field_contact_phone") || ""; // Text (formatted)
            homePage.contactEmailHeader = getFieldValue(homePageObj, "field_contact_email_header") || ""; // Text (formatted)
            homePage.contactEmail = getFieldValue(homePageObj, "field_contact_email") || ""; // Text (formatted)
            // get the social links
            homePage.twitter = getFieldValue(homePageObj, "field_twitter") || ""; // Text (formatted)
            homePage.facebook = getFieldValue(homePageObj, "field_facebook") || ""; // Text (formatted)
            homePage.linkedin = getFieldValue(homePageObj, "field_linkedin") || ""; // Text (formatted)

            // add all home page variables to the metalsmith metadata
            let metadata = metalsmith.metadata();
            metadata.homePage = homePage;
            metalsmith.metadata(metadata);

            const fileName = "index.html";
            const page = {
                layout: "default-page.html",
                title: "ORCA | Home",
                contents: new Buffer("This is still the home page")
            }

            // add page to metalsmith object
            files[fileName] = page;

            done();
        });
    };
}

module.exports = plugin;