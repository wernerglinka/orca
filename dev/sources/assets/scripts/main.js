/*jslint regexp: true, nomen: true, vars: true, plusplus: true*/

/*global document, body, window, requestAnimationFrame*/
(function () {
  'use strict'; // fade out

  function fadeOut(el) {
    el.style.opacity = 1;

    (function fade() {
      if ((el.style.opacity -= 0.1) < 0) {
        el.style.display = "none";
      } else {
        requestAnimationFrame(fade);
      }
    })();
  } // fade in


  function fadeIn(el, display) {
    el.style.opacity = 0;
    el.style.display = display || "block";

    (function fade() {
      let val = parseFloat(el.style.opacity);

      if (!((val += 0.1) > 1)) {
        el.style.opacity = val;
        requestAnimationFrame(fade);
      }
    })();
  }

  const initialScreeState = function () {
    let init = function () {
      let img = new Image();

      img.onload = function () {
        document.body.classList.remove("isLoading");
      };

      img.src = "http://dev-orca.pantheonsite.io/sites/default/files/home-page/fullscreen_image.jpg";
    };

    return {
      init: init
    };
  }(); //the document ready function


  document.addEventListener("DOMContentLoaded", function (event) {
    initialScreeState.init();
  }); // end ready function
})();