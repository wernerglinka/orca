/*jslint regexp: true, nomen: true, vars: true, plusplus: true*/
/*global document, body, window, requestAnimationFrame, Image*/


(function () {

    'use strict';

    // fade out
    function fadeOut(el) {
        el.style.opacity = 1;

        (function fade() {
            if ((el.style.opacity -= 0.1) < 0) {
                el.style.display = "none";
            } else {
                requestAnimationFrame(fade);
            }
        }());
    }

    // fade in
    function fadeIn(el, display) {
        el.style.opacity = 0;
        el.style.display = display || "block";

        (function fade() {
            let val = parseFloat(el.style.opacity);
            if (!((val += 0.1) > 1)) {
                el.style.opacity = val;
                requestAnimationFrame(fade);
            }
        }());
    }

    const initialScreenState = (function () {
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
    }());

    // function to add line numbers wrapper to syntax code lines
    // numbers are added via CSS counter
    const lineNumbers = (function () {
        let init = function () {
            const codeContainers = document.getElementsByClassName('line-numbers');
            let codeArray, i;

            for (let i = 0; codeContainers.length > i; i++) {
                let thisCodeContainer = codeContainers[i];
                //insert a new line after open <code> tag
                thisCodeContainer.querySelector('code').prepend('\n');

                // add a line wrapper to each code line
                codeArray = thisCodeContainer.outerHTML.split('\n');
                // start with the second array element and stop before the last so we don't wrap the <pre><code> tags
                for (i = 0; i < codeArray.length; i++) {
                    codeArray[i] = "<span class='code-line'>" + codeArray[i] + "</span>";
                }
                // replace code
                thisCodeContainer.outerHTML = codeArray.join('\n');
            }
        };

        return {
            init: init
        }
    }());

    // function to scroll softly to on-page anchors
    const softScroll = (function ($) {
        'use strict';

        // filter handling for a /dir/ OR /indexordefault.page
        var filterPath = function (string) {
            return string
                .replace(/^\//, '')
                .replace(/(index|default).[a-zA-Z]{3,4}$/, '')
                .replace(/\/$/, '');
        };

        var init = function () {
            // source: https://css-tricks.com/smooth-scrolling-accessibility/
            // URL updates and the element focus is maintained
            // originally found via in Update 3 on http://www.learningjquery.com/2007/10/improved-animated-scrolling-script-for-same-page-links
            //
            // the code from css-tricks has an obscure bug that causes urls of the form https://caniuse.com/#search=requestAnimationFrame
            // to cause an jQuery error: Uncaught Error: Syntax error, unrecognized expression: #search=requestAnimationFrame
            // the error is caused by this selector $('a[href*="#"]') as this selector selects urls that have an "#" in any place
            // Changing that to $('a[href^="#"]') insures that only hashes that START with and "#" are selected.

            const locationPath = filterPath(location.pathname);
            $('a[href^="#"]').each(function () {
                const thisPath = filterPath(this.pathname) || locationPath;
                const hash = this.hash;
                if ($("#" + hash.replace(/#/, '')).length) {
                    if (locationPath === thisPath && (location.hostname === this.hostname || !this.hostname) && this.hash.replace(/#/, '')) {
                        const $target = $(hash), target = this.hash;
                        if (target) {
                            $(this).on('click', function (event) {
                                event.preventDefault();
                                $('html, body').animate({
                                    scrollTop: $target.offset().top
                                }, 1000);
                            });
                        }
                    }
                }
            });
        };

        return {
            init: init
        };
    }(jQuery));

    // function to attach a class to the body element when the hamburger is touched/clicked
    const hamburger = (function ($) {
        'use strict';

        let init = function () {
            const thisPage = $('body');
            const hamburger = $('.hamburger');
            const thisMenuLayer = $('.navigation').find('ul');

            hamburger.on('click', function () {
                if (thisPage.hasClass('navActive')) {
                    thisPage.removeClass('navActive');
                    thisMenuLayer.fadeOut();
                } else {
                    thisMenuLayer.fadeIn();
                    thisPage.addClass('navActive');
                }
            });

            // hide nav menu after selection and when scrolling
            thisMenuLayer.find('>li').on('click', function () {
                thisPage.removeClass('navActive');
                thisMenuLayer.fadeOut();
            });
            $(window).on('scroll', function () {
                thisPage.removeClass('navActive');
                thisMenuLayer.fadeOut();
            });
        };

        return {
            init: init
        };
    }(jQuery));

    // function to manage toTop icon visibility
    const toTopIcon = (function ($) {
        'use strict';

        let init = function () {
            const toTop = $('#toTopButton');

            if ($(document).scrollTop() >= 500) {
                toTop.fadeIn();
            } else {
                toTop.fadeOut();
            }

            $(window).on('scroll', function () {
                if ($(document).scrollTop() >= 500) {
                    if (toTop.is(':hidden')) {
                        toTop.fadeIn();
                    }
                } else {
                    if (!toTop.is(':hidden')) {
                        toTop.fadeOut();
                    }
                }
            });
        };

        return {
            init: init
        };
    }(jQuery));

    //the document ready function
    document.addEventListener("DOMContentLoaded", function (event) {
        initialScreenState.init();
        lineNumbers.init();
        hamburger.init();
        softScroll.init();
        toTopIcon.init();

        // init Isotope
        var $grid = $('.grid').isotope({
            itemSelector: '.element-item'
        });

        // bind filter button click
        $('#filters').on( 'click', 'a', function() {
            var filterValue = $( this ).attr('data-filter');

            console.log(filterValue);
            // use filterFn if matches value
            $grid.isotope({ filter: filterValue });
        });
    });
    // end ready function
}());