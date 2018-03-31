// the request must not contain any comments, spaces or line breaks. This representation is for readability only. Use 'commonTags.oneLineTrim' if necessary 

http://dev-orca.pantheonsite.io/jsonapi/node/home_page?_format=api_json
    &filter[titleFilter][condition][path]=title
    &filter[titleFilter][condition][value]=Orca Home Global
    &fields[node--home_page]=field_site_name,                     // use only these fields of the main node
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
    &fields[node--testimonials]=body,                             // use only these fields of the referenced node
        field_author,
        field_title,
        field_affiliation
    &fields[node--services]=body,                                 // use only these fields of the referenced node
        field_service_provided,
        field_service_thumbnail
    &include=field_welcome_bg_img,                                // include only these fields of the referenced nodes
        field_about_image,
        field_testimonials,
        field_service_image,
        field_our_services,
        field_our_services.field_service_thumbnail,
        field_projects,
        field_projects.field_project_image,
        field_projects,
        field_projects.field_project_image