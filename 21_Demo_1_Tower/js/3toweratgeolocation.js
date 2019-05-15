var World = {
    /*
        User's latest known location, accessible via userLocation.latitude, userLocation.longitude,
         userLocation.altitude.
     */
    userLocation: null,

//    /* You may request new data from server periodically, however: in this sample data is only requested once. */
//    isRequestingData: false,

    /* True once data was fetched. */
    initiallyLoadedData: false,

    /* Different POI-Marker assets. */
    markerDrawableIdle: null,
    markerDrawableSelected: null,
    markerDrawableDirectionIndicator: null,

    /* List of AR.GeoObjects that are currently shown in the scene / World. */
    markerList: [],

    /* the last selected marker. */
    currentMarker: null,

    // selected to navigate marker
    selectedMarker: null,

    locationUpdateCounter: 0,
    updatePlacemarkDistancesEveryXLocationUpdates: 10,

//    init: function initFn() {
//        this.createModelAtLocation();
//    },
//
//    createModelAtLocation: function createModelAtLocationFn() {
//
//        /*
//            First a location where the model should be displayed will be defined. This location will be relativ to
//            the user.
//        */
////        var location = new AR.RelativeLocation(null, 50, -50, 0);
////        var location = new AR.GeoLocation(51.689153, 39.261848, 118);
//        var location = new AR.GeoLocation(51.689153, 39.261848, 0);
//
//        /* Next the model object is loaded. */
//        var modelEarth = new AR.Model("assets/House.wt3", {
//            onLoaded: this.worldLoaded,
//            onError: World.onError,
//            scale: {
//                x: 1,
//                y: 1,
//                z: 1
//            }
//        });
//
//        var indicatorImage = new AR.ImageResource("assets/indi.png", {
//            onError: World.onError
//        });
//
//        var indicatorDrawable = new AR.ImageDrawable(indicatorImage, 0.1, {
//            verticalAnchor: AR.CONST.VERTICAL_ANCHOR.TOP
//        });
//
//        /* Putting it all together the location and 3D model is added to an AR.GeoObject. */
//        this.geoObject = new AR.GeoObject(location, {
//            drawables: {
//                cam: [modelEarth],
//                indicator: [indicatorDrawable]
//            }
//        });
//    },
//
//    worldLoaded: function worldLoadedFn() {
//        World.showUserMessage("Ready 6.");
//    },

    /* Called to inject new POI data. */
    loadPoisFromJsonData: function loadPoisFromJsonDataFn(poiData, latitude, longitude) {

        /* Empty list of visible markers. */
        World.markerList = [];

        /* Start loading marker assets. */
        World.markerDrawableIdle = new AR.ImageResource("assets/marker_idle.png", {
            onError: World.onError
        });
        World.markerDrawableSelected = new AR.ImageResource("assets/marker_selected.png", {
            onError: World.onError
        });
        World.markerDrawableDirectionIndicator = new AR.ImageResource("assets/indi.png", {
            onError: World.onError
        });

        /* Loop through POI-information and create an AR.GeoObject (=Marker) per POI. */
        for (var currentPlaceNr = 0; currentPlaceNr < poiData.length; currentPlaceNr++) {
            var singlePoi = {
                "id": poiData[currentPlaceNr].id,
                "latitude": parseFloat(poiData[currentPlaceNr].latitude),
                "longitude": parseFloat(poiData[currentPlaceNr].longitude),
                "altitude": parseFloat(poiData[currentPlaceNr].altitude),
                "title": poiData[currentPlaceNr].name,
                "description": poiData[currentPlaceNr].description
            };

            World.markerList.push(new Marker(singlePoi));
        }

        // добавить близкую точку
        var singlePoi = {
            "id": 3,
            "latitude": latitude + (Math.random() / 5 - 0.1),
            "longitude": longitude + (Math.random() / 5 - 0.1),
            "altitude": AR.CONST.UNKNOWN_ALTITUDE,
            "title": "POI#N",
            "description": "Nearby POI"
        };
        World.markerList.push(new Marker(singlePoi));
        currentPlaceNr = currentPlaceNr + 1;


        /* Updates distance information of all placemarks. */
        World.updateDistanceToUserValues();

//        World.showUserMessage("cullingDistance=" + AR.context.scene.cullingDistance);
        World.showUserMessage(currentPlaceNr + ' places loaded');
    },

    /* Request POI data. */
    requestDataFromLocal: function requestDataFromLocalFn(lat, lon) {

//        var poisNearby = Helper.bringPlacesToUser(myJsonData, lat, lon);
//        World.loadPoisFromJsonData(poisNearby);

        World.loadPoisFromJsonData(myJsonData, lat, lon);
    },

    /*
        Sets/updates distances of all makers so they are available way faster than calling (time-consuming)
        distanceToUser() method all the time.
     */
    updateDistanceToUserValues: function updateDistanceToUserValuesFn() {
        var minDistance = 10000000;
        var maxDistance = 0;
        var minDistanceName = "POI";
        var maxDistanceName = "POI";

        for (var i = 0; i < World.markerList.length; i++) {
            World.markerList[i].distanceToUser = World.markerList[i].markerObject.locations[0].distanceToUser();

            if(World.markerList[i].distanceToUser < minDistance){
                minDistance = World.markerList[i].distanceToUser;
                minDistanceName = World.markerList[i].poiData.title;
            }
            if(World.markerList[i].distanceToUser > maxDistance){
                maxDistance = World.markerList[i].distanceToUser;
                maxDistanceName = World.markerList[i].poiData.title;
            }
        }

        World.updateStatusMessage('min=' + minDistance + ' (' + minDistanceName + ') max=' + maxDistance + ' (' + maxDistanceName + ')');
    },

    locationChanged: function locationChangedFn(lat, lon, alt, acc) {
//        World.showUserMessage("lat: " + lat + " lon: " + lon + " alt: " + alt + " acc: " + acc);

        /* Store user's current location in World.userLocation, so you always know where user is. */
        World.userLocation = {
            'latitude': lat,
            'longitude': lon,
            'altitude': alt,
            'accuracy': acc
        };


        /* Request data if not already present. */
        if (!World.initiallyLoadedData) {
            World.requestDataFromLocal(lat, lon);
            World.initiallyLoadedData = true;
        } else if (World.locationUpdateCounter === 0) {
            /*
                Update placemark distance information frequently, you max also update distances only every 10m with
                some more effort.
             */
            World.updateDistanceToUserValues();
        }

        /* Helper used to update placemark information every now and then (e.g. every 10 location upadtes fired). */
        World.locationUpdateCounter =
            (++World.locationUpdateCounter % World.updatePlacemarkDistancesEveryXLocationUpdates);
    },

    /* Returns distance in meters of placemark with maxdistance * 1.1. */
    getMaxDistance: function getMaxDistanceFn() {

        /* Sort places by distance so the first entry is the one with the maximum distance. */
        World.markerList.sort(World.sortByDistanceSortingDescending);

        /* Use distanceToUser to get max-distance. */
        var maxDistanceMeters = World.markerList[0].distanceToUser;

        /*
            Return maximum distance times some factor >1.0 so ther is some room left and small movements of user
            don't cause places far away to disappear.
         */
        return maxDistanceMeters * 1.1;
    },

    /* Helper to sort places by distance. */
    sortByDistanceSorting: function sortByDistanceSortingFn(a, b) {
        return a.distanceToUser - b.distanceToUser;
    },

    /* Helper to sort places by distance, descending. */
    sortByDistanceSortingDescending: function sortByDistanceSortingDescendingFn(a, b) {
        return b.distanceToUser - a.distanceToUser;
    },

    /* Fired when user pressed maker in cam. */
    onMarkerSelected: function onMarkerSelectedFn(marker) {
        World.currentMarker = marker;

        /*
            In this sample a POI detail panel appears when pressing a cam-marker (the blue box with title &
            description), compare index.html in the sample's directory.
        */
        /* Update panel values. */
        $("#poi-detail-title").html(marker.poiData.title);
        $("#poi-detail-description").html(marker.poiData.description);


        /*
            It's ok for AR.Location subclass objects to return a distance of `undefined`. In case such a distance
            was calculated when all distances were queried in `updateDistanceToUserValues`, we recalculate this
            specific distance before we update the UI.
         */
        if (undefined === marker.distanceToUser) {
            marker.distanceToUser = marker.markerObject.locations[0].distanceToUser();
        }

        /*
            Distance and altitude are measured in meters by the SDK. You may convert them to miles / feet if
            required.
        */
        var distanceToUserValue = (marker.distanceToUser > 999) ?
            ((marker.distanceToUser / 1000).toFixed(2) + " km") :
            (Math.round(marker.distanceToUser) + " m");

        $("#poi-detail-distance").html(distanceToUserValue);

        /* Show panel. */
        $("#panel-poidetail").panel("open", 123);

        $(".ui-panel-dismiss").unbind("mousedown");

//        /* Deselect AR-marker when user exits detail screen div. */
//        $("#panel-poidetail").on("panelbeforeclose", function(event, ui) {
//            if((World.selectedMarker == null) || (World.currentMarker.poiData.id !== World.selectedMarker.poiData.id))
//                World.currentMarker.setDeselected(World.currentMarker);
//        });
    },

    /* User clicked "Navigate" button in POI-detail panel -> fire event to open native screen. */
    onCloseButtonClicked: function onCloseButtonClickedFn() {
        if((World.selectedMarker == null) || (World.currentMarker.poiData.id !== World.selectedMarker.poiData.id))
            World.currentMarker.setDeselected(World.currentMarker);

        $("#panel-poidetail").panel("close");
    },

    /* User clicked "Navigate" button in POI-detail panel -> fire event to open native screen. */
    onPoiNavigateButtonClicked: function onPoiNavigateButtonClickedFn() {
        if (World.selectedMarker) {
            World.selectedMarker.setDeselected(World.selectedMarker);
        }

        if (World.currentMarker) {
            World.selectedMarker = World.currentMarker;
        }

        $("#panel-poidetail").panel("close");
    },


    /* Screen was clicked but no geo-object was hit. */
    onScreenClick: function onScreenClickFn() {
        if (World.currentMarker) {
            World.currentMarker.setDeselected(World.currentMarker);
        }

        if (World.selectedMarker) {
            World.selectedMarker.setDeselected(World.selectedMarker);
            World.selectedMarker = null;
        }
    },

    showUserMessage: function showUserMessageFn(message) {
        document.getElementById('loadingMessage').innerHTML = message;
    },

    /* Updates status message shown in small "i"-button aligned bottom center. */
    updateStatusMessage: function updateStatusMessageFn(message, isWarning) {

        var themeToUse = isWarning ? "e" : "c";
        var iconToUse = isWarning ? "alert" : "info";

        $("#status-message").html(message);
        $("#popupInfoButton").buttonMarkup({
            theme: themeToUse,
            icon: iconToUse
        });
    },

    onError: function onErrorFn(error) {
        alert(error);
    }
};

//var Helper = {
//
//    /*
//        For demo purpose only, this method takes poi data and a center point (latitude, longitude) to relocate the
//        given places randomly around the user
//    */
//    bringPlacesToUser: function bringPlacesToUserFn(poiData, latitude, longitude) {
//        for (var i = 0; i < poiData.length; i++) {
//            poiData[i].latitude = latitude;
//            poiData[i].longitude = longitude;
//            poiData[i].altitude = 0;
//
////            poiData[i].latitude = latitude + (Math.random() / 5 - 0.1);
////            poiData[i].longitude = longitude + (Math.random() / 5 - 0.1);
////            /*
////                Note: setting altitude to '0' will cause places being shown below / above user, depending on the
////                user 's GPS signal altitude. Using this contant will ignore any altitude information and always
////                show the places on user-level altitude.
////            */
////            poiData[i].altitude = AR.CONST.UNKNOWN_ALTITUDE;
//        }
//        return poiData;
//    }
//};


//World.init();

/* Forward locationChanges to custom function. */
AR.context.onLocationChanged = World.locationChanged;

/* Forward clicks in empty area to World. */
AR.context.onScreenClick = World.onScreenClick;