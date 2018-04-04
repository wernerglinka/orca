/*jslint regexp: true, nomen: true, vars: true, plusplus: true*/

/*global document, body, window, requestAnimationFrame, Image*/
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

  const initialScreenState = function () {
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
  }(); // function to add line numbers wrapper to syntax code lines
  // numbers are added via CSS counter


  const lineNumbers = function () {
    let init = function () {
      const codeContainers = document.getElementsByClassName('line-numbers');
      let codeArray, i;
      console.log(codeContainers);

      for (let i = 0; codeContainers.length > i; i++) {
        let thisCodeContainer = codeContainers[i]; //insert a new line after open <code> tag

        thisCodeContainer.querySelector('code').prepend('\n'); // add a line wrapper to each code line

        codeArray = thisCodeContainer.outerHTML.split('\n'); // start with the second array element and stop before the last so we don't wrap the <pre><code> tags

        for (i = 0; i < codeArray.length; i++) {
          codeArray[i] = "<span class='code-line'>" + codeArray[i] + "</span>";
        } // replace code


        thisCodeContainer.outerHTML = codeArray.join('\n');
      }
    };

    return {
      init: init
    };
  }(); //the document ready function


  document.addEventListener("DOMContentLoaded", function (event) {
    initialScreenState.init();
    lineNumbers.init();
  }); // end ready function
})();
//# sourceMappingURL=main.js.map
