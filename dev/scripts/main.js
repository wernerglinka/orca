/*jslint regexp: true, nomen: true, vars: true, plusplus: true*/
/*global document, body, window, requestAnimationFrame, Image*/


const homePage = new Vue ({
    el: '#homePage',
    data: {
        isLoading: true
    },

    mounted:  () => {
        'use strict';
        let img = new Image();
        img.onload = () => {
            document.body.classList.remove("isLoading");
        };
        img.src = "http://dev-orca.pantheonsite.io/sites/default/files/home-page/fullscreen_image.jpg";
    }
});