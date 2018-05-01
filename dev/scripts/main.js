/*jslint regexp: true, nomen: true, vars: true, plusplus: true*, this/
/*global document, body, window, requestAnimationFrame, Image*/

/**
 * shared data store
 */
const store = {
    state: {
        navIsVisible: false
    },
    toggleVisibility (visibility) {
        this.state.navIsVisible = visibility;
    }
}



/**
 * Mixin to share methods
 */
const sharedMethods = {
    methods: {
        softScroll: function (event, target) {
            event.stopPropagation();
            event.preventDefault(); 
            
            if(this.sharedState.navIsVisible) {
                document.body.classList.remove("navActive");
            }
            // toggle nav state
            store.toggleVisibility(false)

            // soft scroll to the target
            Velocity(document.querySelector(target), "scroll", { duration: 1000, easing: "linear" });
        }
    }
}



/**
 * toTop component
 */
const toTopComponent = {
    mixins: [ sharedMethods ],
    data: function () {
        'use strict';
        return {
            toTopIsVisible: false,
            sharedState: store.state,
            toggleState: store.toggleVisibility
        };
    },
    template:
            `<a v-show="toTopIsVisible" @click="softScroll(event, '#onTop')" id="toTopButton" href="#onTop"><i class="icon icon-arrow-up"></i></a>`,
    mounted: function () {
        'use strict';
        const thisComponent = this;

        if (window.scrollY >= 500) {
            thisComponent.toTopIsVisible = true;
        } else {
            thisComponent.toTopIsVisible = false;
        }

        window.addEventListener('scroll', function() {
            if (window.scrollY >= 500) {
                thisComponent.toTopIsVisible = true;
            } else {
                thisComponent.toTopIsVisible = false;
            }
        });
    }
};



/**
 * navigation component]
 */
const navComponent = {
    mixins: [ sharedMethods ],
    data: function () {
        'use strict';
        return {
            sharedState: store.state,
            toggleState: store.toggleVisibility
        };
    },
    methods: {
        toggleMenu: function () {
            'use strict';
            const thisComponent = this;
            // toggle the menu
           
            // toggle nav state
            store.toggleVisibility(!this.sharedState.navIsVisible)

            // add navActive class to the body element
            if(this.sharedState.navIsVisible) {
                document.body.classList.add("navActive");
            } else {
                document.body.classList.remove("navActive");
            }
        }
    },
    template:
        `
        <div class="navigation">
            <a class="hamburger" @click="toggleMenu"><span></span></a>
            <transition name="fade">
            <ul v-show="store.state.navIsVisible">
                <li><a @click="softScroll(event, '#about')" href="#about">About ORCA</a></li>
                <li><a @click="softScroll(event, '#services')" href="#services">Our Services</a></li>
                <li><a @click="softScroll(event, '#projects')" href="#projects">Our Projects</a></li>
                <li><a @click="softScroll(event, '#blogs')" href="#blogs">Featured Blogs</a></li>
                <li><a @click="softScroll(event, '#contact')" href="#contact">Contact Us</a></li>
            </ul>
            </transition>
        </div>`
};



const homePage = new Vue ({
    el: '#homePage',
    data: {
        isLoading: true,
        prose1Visible: true
    },
    components: {
        'to-top': toTopComponent,
        'homepage-nav': navComponent
    },
    mounted: () => {
        'use strict';
        let img = new Image();
        img.src = 'http://dev-orca.pantheonsite.io/sites/default/files/home-page/fullscreen_image.jpg';
        img.onload = () => {
            document.body.classList.remove("isLoading");
        };
    }
});