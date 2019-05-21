var World = {

    // Расстояние переключения с метки на модель (м)
    nearDistance: 50,

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

    // модель
    targetGeoObject: null,

    init: function initFn() {
        AR.logger.activateDebugMode();
    },

    createModelAtLocation: function createModelAtLocationFn(marker) {

        /*
            First a location where the model should be displayed will be defined. This location will be relativ to
            the user.
        */
//        var location = new AR.RelativeLocation(null, 50, -50, 0);
//        var location = new AR.GeoLocation(51.689153, 39.261848, 118);
//        var location = new AR.GeoLocation(51.689153, 39.261848, 0);

        var modelLocation = new AR.GeoLocation(marker.poiData.latitude, marker.poiData.longitude, AR.CONST.UNKNOWN_ALTITUDE);

        /* Next the model object is loaded. */
        var model = new AR.Model("assets/House.wt3", {
//            onLoaded: this.worldLoaded,
            onError: World.onError,
            scale: {
                x: 1,
                y: 1,
                z: 1
            },
            //rotatesToCamera: true
        });

        if (model.rotatesToCamera)
            AR.logger.debug("rotatesToCamera = true");
        else
            AR.logger.debug("rotatesToCamera = false");

//        var indicatorImage = new AR.ImageResource("assets/indi.png", {
//            onError: World.onError
//        });
//
//        var indicatorDrawable = new AR.ImageDrawable(indicatorImage, 0.1, {
//            verticalAnchor: AR.CONST.VERTICAL_ANCHOR.TOP
//        });

        /* Putting it all together the location and 3D model is added to an AR.GeoObject. */
        this.targetGeoObject = new AR.GeoObject(modelLocation, {
            drawables: {
                cam: [model],
            },
            enabled: false
        });
    },
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

//var currentPlaceNr = 0;
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
//        var singlePoi = {
//            "id": currentPlaceNr,
//            "latitude": latitude + (Math.random() / 5 - 0.1),
//            "longitude": longitude + (Math.random() / 5 - 0.1),
//            "altitude": AR.CONST.UNKNOWN_ALTITUDE,
//            "title": "POI#N",
//            "description": "Nearby POI"
//        };

//        for (var tt = 1; tt <= 10; tt++) {
//            var singlePoi = {
//                "id": 10 + tt,
//                "latitude": latitude - 0.0000001*(tt*10),
//                "longitude": longitude,
////            "longitude": longitude + (Math.random() / 5 - 0.1),
//                "altitude": AR.CONST.UNKNOWN_ALTITUDE,
//                "title": "POI#T",
//                "description": "p" + tt
//            };
//
//            World.markerList.push(new Marker(singlePoi));
//        }

//        var relationLocation = new AR.RelativeLocation(null, -5, 0, 0);
//        var geoObj = new AR.GeoObject(relationLocation, enabled: false);
//        var nearLocation = geoObj.locations[0];
//        var singlePoi = {
//            "id": 3,
//            "latitude": nearLocation.,
//            "longitude": longitude + (Math.random() / 5 - 0.1),
//            "altitude": AR.CONST.UNKNOWN_ALTITUDE,
//            "title": "POI#N",
//            "description": "Nearby POI"
//        };
//        World.markerList.push(new Marker(singlePoi));
//        currentPlaceNr = currentPlaceNr + tt;
        World.showUserMessage(currentPlaceNr + ' places loaded');

        /* Updates distance information of all placemarks. */
        World.updateDistanceToUserValues();

//        World.showUserMessage("cullingDistance=" + AR.context.scene.cullingDistance);
        AR.context.scene.minScalingDistance = 10;
        AR.context.scene.maxScalingDistance = 200;
        AR.context.scene.scalingFactor = 0.1;

        World.showUserMessage("minScalingDistance=" + AR.context.scene.minScalingDistance + " maxScalingDistance=" + AR.context.scene.maxScalingDistance + " ScalingFactor=" + AR.context.scene.scalingFactor);
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

        World.stateOnDistance();

        /* Helper used to update placemark information every now and then (e.g. every 10 location upadtes fired). */
        World.locationUpdateCounter =
            (++World.locationUpdateCounter % World.updatePlacemarkDistancesEveryXLocationUpdates);
    },

    // отслеживаем гео пользователя, если близко то показываем модель, если далеко, то показываем poi
    stateOnDistance: function stateOnDistanceFn() {

        if(World.selectedMarker){
            var distance = World.selectedMarker.distanceToUser;

    //        var e = document.getElementById('loadingMessage');
            if (distance < World.nearDistance)
            {
                if (World.targetGeoObject.enabled != true)
                {
                    World.targetGeoObject.enabled = true;
                    World.selectedMarker.markerObject.enabled = false;

//                    AR.logger.debug('Мы рядом с целью!');

//                    for (var i = 0; i < World.markerList.length; i++) {
//                        if(World.selectedMarker.poiData.id === World.markerList[i]..poiData.id)
//                    }

//                    e.innerHTML = "Мы рядом с целью! Нажмите на неё!";
                }
            }
            else
            {
                if (World.selectedMarker.markerObject.enabled != true)
                {
                    World.targetGeoObject.enabled = false;
                    World.selectedMarker.markerObject.enabled = true;

//                    AR.logger.debug('Мы не рядом с целью!');
                }
    //
    //            e.innerHTML = distance + " метров";
            }

//          World.showUserMessage(distance + ' m to POI, lat=' + World.userLocation.latitude + ' lon=' + World.userLocation.longitude);
            World.showUserMessage(World.formatNum(distance, 0) + 'm to ' + World.selectedMarker.poiData.description + ' (lat=' + World.formatNum(World.userLocation.latitude, 4) + ' lon=' + World.formatNum(World.userLocation.longitude, 4) + ')');
        }
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

            World.createModelAtLocation(World.selectedMarker);
        }

        $("#panel-poidetail").panel("close");
    },


    // Screen was clicked but no geo-object was hit.
    // Убрать выделенные метки, скрыть модель
    onScreenClick: function onScreenClickFn() {

        if (World.currentMarker) {
            World.currentMarker.setDeselected(World.currentMarker);
        }

        if(World.targetGeoObject){
            World.selectedMarker.markerObject.enabled = true;
//            World.targetGeoObject.enabled = false;

            World.targetGeoObject.destroy();
//            delete World.targetGeoObject;
            World.targetGeoObject = null;
        }

        if (World.selectedMarker) {
            World.selectedMarker.setDeselected(World.selectedMarker);
            World.selectedMarker = null;

            //delete World.targetGeoObject;
            //World.targetGeoObject = null;
        }

        World.showUserMessage('Select POI to navigate');
    },

    formatNum: function formatNumFn(num, decimals) {
        var sign = num >= 0 ? 1 : -1;
        return (Math.round((num * Math.pow(10, decimals)) + (sign * 0.001)) / Math.pow(10, decimals)).toFixed(decimals);
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


World.init();

/* Forward locationChanges to custom function. */
AR.context.onLocationChanged = World.locationChanged;

/* Forward clicks in empty area to World. */
AR.context.onScreenClick = World.onScreenClick;