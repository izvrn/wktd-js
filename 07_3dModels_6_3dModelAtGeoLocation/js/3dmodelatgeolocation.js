var World = {

    init: function initFn() {
        this.createModelAtLocation();
    },

    createModelAtLocation: function createModelAtLocationFn() {

        /*
            First a location where the model should be displayed will be defined. This location will be relativ to
            the user.
        */
        var location = new AR.RelativeLocation(null, 5, 0, 2);

        /* Next the model object is loaded. */
        var modelEarth = new AR.Model("assets/earth.wt3", {
            onLoaded: this.worldLoaded,
            onError: World.onError,
            scale: {
                x: 1,
                y: 1,
                z: 1
            }
        });

        var indicatorImage = new AR.ImageResource("assets/indi.png", {
            onError: World.onError
        });

        var indicatorDrawable = new AR.ImageDrawable(indicatorImage, 0.1, {
            verticalAnchor: AR.CONST.VERTICAL_ANCHOR.TOP
        });

        /* Putting it all together the location and 3D model is added to an AR.GeoObject. */
        this.geoObject = new AR.GeoObject(location, {
            drawables: {
                cam: [modelEarth],
                indicator: [indicatorDrawable]
            }
        });
    },

    onError: function onErrorFn(error) {
        alert(error);
    },

    worldLoaded: function worldLoadedFn() {
//        document.getElementById("loadingMessage").style.display = "none";
        World.showUserInstructions("Ready 6.");
    },

    locationChanged: function locationChangedFn(lat, lon, alt, acc) {

        World.showUserInstructions("lat: " + lat + " lon: " + lon + " alt: " + alt);
//        if (!World.initiallyLoadedData) {
//
//            var indicatorImage = new AR.ImageResource("assets/indi.png");
//            World.indicatorDrawable = new AR.ImageDrawable(indicatorImage, 0.1, {
//                                                               verticalAnchor: AR.CONST.VERTICAL_ANCHOR.TOP
//                                                           });
//
//            World.targetLocation = new AR.GeoLocation(59.000573, 30.334724, AR.CONST.UNKNOWN_ALTITUDE);
//
//            World.loadPoisFromJsonData();
//            World.createModelAtLocation();
//            World.initiallyLoadedData = true;
//        }
//
//        // store user's current location in World.userLocation, so you always know where user is
//        World.userLocation = {
//            'latitude': lat,
//            'longitude': lon,
//            'altitude': alt,
//            'accuracy': acc
//        };
//
//        if (World.targetLocation)
//        {
//            World.stateOnDistance();
//
//            var latDirection = World.targetLocation.latitude - World.userLocation.latitude;
//            var lonDirection = World.targetLocation.longitude - World.userLocation.longitude;
//        }
    },

    showUserInstructions: function showUserInstructionsFn(message) {
        document.getElementById('loadingMessage').innerHTML = message;
    },

    formatNum: function formatNumFn(num, decimals) {
        var sign = num >= 0 ? 1 : -1;
        return (Math.round((num*Math.pow(10,decimals)) + (sign*0.001)) / Math.pow(10,decimals)).toFixed(decimals);
    }
};

World.init();

AR.context.onLocationChanged = World.locationChanged;