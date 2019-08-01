var defaultScaleValue = 0.045;
var defaultRotationValue = 0;

var rotationValues = [];
var scaleValues = [];

var allCurrentModels = [];

var oneFingerGestureAllowed = false;

AR.context.on2FingerGestureStarted = function() {
    oneFingerGestureAllowed = false;
};

var World = {
    platformAssisstedTrackingSupported: false,
    createOverlaysCalled: false,
    // Расстояние переключения с метки на модель (м)
    nearDistance: 30,
    initialDrag: false,
    /*
        User's latest known location, accessible via userLocation.latitude, userLocation.longitude,
         userLocation.altitude.
     */
    userLocation: null,
    prevDistance: -1.0,

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
    singlePoiList: [],

    /* the last selected marker. */
    currentMarker: null,

    // selected to navigate marker
    selectedMarker: null,
    selectedMarkerID: -1,
    isMarkerSelected: false,

    locationUpdateCounter: 0,
    updatePlacemarkDistancesEveryXLocationUpdates: 10,

    // модель
    targetGeoObject: null,

    isImgListItemVisible: false,

    init: function initFn() {
        AR.logger.activateDebugMode();

        AR.hardware.smart.isPlatformAssistedTrackingSupported();
    },

    createOverlays: function createOverlaysFn() {
            if (World.createOverlaysCalled) {
                return;
            }

            World.createOverlaysCalled = true;

            var crossHairsRedImage = new AR.ImageResource("assets/crosshairs_red.png", {
                onError: World.onError
            });
            this.crossHairsRedDrawable = new AR.ImageDrawable(crossHairsRedImage, 1.0);

            var crossHairsBlueImage = new AR.ImageResource("assets/crosshairs_blue.png", {
                onError: World.onError
            });
            this.crossHairsBlueDrawable = new AR.ImageDrawable(crossHairsBlueImage, 1.0);

            var crossHairsGreenImage = new AR.ImageResource("assets/crosshairs_green.png", {
                onError: World.onError
            });
            this.crossHairsGreenDrawable = new AR.ImageDrawable(crossHairsGreenImage, 1.0);

            this.tracker = new AR.InstantTracker({
                onChangedState: function onChangedStateFn(state) {

                },
                deviceHeight: 1.0,
                onError: World.onError,
                onChangeStateError: World.onError
            });

            this.instantTrackable = new AR.InstantTrackable(this.tracker, {
                drawables: {
                    cam: World.crossHairsBlueDrawable,
                    initialization: World.crossHairsRedDrawable
                },
                onTrackingStarted: function onTrackingStartedFn() {
                    /* Do something when tracking is started (recognized). */
                },
                onTrackingStopped: function onTrackingStoppedFn() {
                    /* Do something when tracking is stopped (lost). */
                },
                onTrackingPlaneClick: function onTrackingPlaneClickFn(xPos, yPos) {
                    /* React to a the tracking plane being clicked here. */
                },
                onTrackingPlaneDragBegan: function onTrackingPlaneDragBeganFn(xPos, yPos) {
                    oneFingerGestureAllowed = true;
                    World.updatePlaneDrag(xPos, yPos);
                },
                onTrackingPlaneDragChanged: function onTrackingPlaneDragChangedFn(xPos, yPos) {
                    World.updatePlaneDrag(xPos, yPos);
                },
                onTrackingPlaneDragEnded: function onTrackingPlaneDragEndedFn(xPos, yPos) {
                    World.updatePlaneDrag(xPos, yPos);
                    World.initialDrag = false;
                },
                onError: World.onError
            });

            setInterval(
                function() {
                    if (World.tracker.canStartTracking) {
                        World.instantTrackable.drawables.initialization = [World.crossHairsGreenDrawable];
                    } else {
                        World.instantTrackable.drawables.initialization = [World.crossHairsRedDrawable];
                    }
                },
                1000
            );

            World.setupEventListeners()
        },

            onError: function onErrorFn(error) {
                alert(error);
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

        var scaleXYZ = marker.poiData.scale.split(',');
        var rotateXYZ = marker.poiData.rotate.split(',');
        var translateXYZ = marker.poiData.translate.split(',');

        var path = marker.poiData.model;

        if (path != "") {
            /* Next the model object is loaded. */
            var model = new AR.Model(path, {
                //onLoaded: this.worldLoaded,
                onError: World.onError,
                scale: {
                    x: parseFloat(scaleXYZ[0]),
                    y: parseFloat(scaleXYZ[1]),
                    z: parseFloat(scaleXYZ[2])
                },
                   // rotates it 90 degrees around the z-axis and 180 degrees around the x-axis
                   rotate: {
                    x: parseFloat(rotateXYZ[0]),
                    y: parseFloat(rotateXYZ[1]),
                    z: parseFloat(rotateXYZ[2])
                   },
                   // moves the 0bject 5 SDUs along the x- and the y-axis
                   translate: {
                    x: parseFloat(translateXYZ[0]),
                    y: parseFloat(translateXYZ[1]),
                    z: parseFloat(translateXYZ[2])
                   },
                rotatesToCamera: false
            });
        }

        //if (model.rotatesToCamera)
        //   AR.logger.debug("rotatesToCamera = true");
        //else
        //    AR.logger.debug("rotatesToCamera = false");

//        var indicatorImage = new AR.ImageResource("assets/indi.png", {
//            onError: World.onError
//        });
//
//        var indicatorDrawable = new AR.ImageDrawable(indicatorImage, 0.1, {
//            verticalAnchor: AR.CONST.VERTICAL_ANCHOR.TOP
//        });

        var indicatorDrawable = new AR.ImageDrawable(World.markerDrawableDirectionIndicator, 0.1, {
                enabled: false,
                verticalAnchor: AR.CONST.VERTICAL_ANCHOR.TOP
            });

        if (path != "") {
            /* Putting it all together the location and 3D model is added to an AR.GeoObject. */
            this.targetGeoObject = new AR.GeoObject(modelLocation, {
                drawables: {
                    cam: [model],
                    indicator: [indicatorDrawable],
                },
                enabled: false,
                onEnterFieldOfVision : function(event) {
                    //World.showImgIndicator();
                    //AR.logger.debug('onEnterFieldOfVision!');
                },
                onExitFieldOfVision  : function(event) {
                    //World.hideImgIndicator();
                    //AR.logger.debug('onExitFieldOfVision!');
                },
            });
        }
        else {
                /* Putting it all together the location and 3D model is added to an AR.GeoObject. */
                this.targetGeoObject = new AR.GeoObject(modelLocation, {
                    drawables: {
                        indicator: [indicatorDrawable],
                    },
                    enabled: false,
                    onEnterFieldOfVision : function(event) {

                    if (World.targetGeoObject != null) {
                            World.showImgIndicator();
                            if (World.isImgListItemVisible == true)
                                $("#viewerPic").css('display', 'block');

                            AR.logger.debug('onEnterFieldOfVision!');
                    }
                    },
                    onExitFieldOfVision  : function(event) {
                    if (World.targetGeoObject != null) {
                            World.hideImgIndicator();

                            if (World.isImgListItemVisible == true)
                                $("#viewerPic").css('display', 'none');

                            AR.logger.debug('onExitFieldOfVision!');
                        }
                    },
                });
        }
    },

    changeTrackerState: function changeTrackerStateFn() {

            if (this.tracker.state === AR.InstantTrackerState.INITIALIZING) {
                this.tracker.state = AR.InstantTrackerState.TRACKING;
            } else {
                this.tracker.state = AR.InstantTrackerState.INITIALIZING;
            }
        },

            updatePlaneDrag: function updatePlaneDragFn(xPos, yPos) {
                if (World.requestedModel >= 0) {
                    World.addModel(World.requestedModel, xPos, yPos);
                    World.requestedModel = -1;
                    World.initialDrag = true;
                }

                if (World.initialDrag && oneFingerGestureAllowed) {
                    World.lastAddedModel.translate = {
                        x: xPos,
                        y: yPos
                    };
                }
            },

            addModel: function addModelFn(pathIndex, xpos, ypos) {
                    if (World.isTracking()) {
                        var modelIndex = rotationValues.length;
                        World.addModelValues();

                        var model = new AR.Model(World.modelPaths[pathIndex], {
                            scale: {
                                x: defaultScaleValue,
                                y: defaultScaleValue,
                                z: defaultScaleValue
                            },
                            translate: {
                                x: xpos,
                                y: ypos
                            },
                            /*
                                We recommend only implementing the callbacks actually needed as they will cause calls from
                                native to JavaScript being invoked. Especially for the frequently called changed callbacks this
                                should be avoided. In this sample all callbacks are implemented simply for demonstrative purposes.
                            */
                            onDragBegan: function( /*x, y*/ ) {
                                oneFingerGestureAllowed = true;
                            },
                            onDragChanged: function(relativeX, relativeY, intersectionX, intersectionY) {
                                if (oneFingerGestureAllowed) {
                                    /*
                                        We recommend setting the entire translate property rather than its individual components
                                        as the latter would cause several call to native, which can potentially lead to performance
                                        issues on older devices. The same applied to the rotate and scale property.
                                    */
                                    this.translate = {
                                        x: intersectionX,
                                        y: intersectionY
                                    };
                                }
                            },
                            onDragEnded: function(x, y) {
                                /* React to the drag gesture ending. */
                            },
                            onRotationBegan: function(angleInDegrees) {
                                /* React to the rotation gesture beginning. */
                            },
                            onRotationChanged: function(angleInDegrees) {
                                this.rotate.z = rotationValues[modelIndex] - angleInDegrees;
                            },
                            onRotationEnded: function( /*angleInDegrees*/ ) {
                                rotationValues[modelIndex] = this.rotate.z
                            },
                            onScaleBegan: function(scale) {
                                /* React to the scale gesture beginning. */
                            },
                            onScaleChanged: function(scale) {
                                var scaleValue = scaleValues[modelIndex] * scale;
                                this.scale = {
                                    x: scaleValue,
                                    y: scaleValue,
                                    z: scaleValue
                                };
                            },
                            onScaleEnded: function( /*scale*/ ) {
                                scaleValues[modelIndex] = this.scale.x;
                            },
                            onError: World.onError
                        });

                        allCurrentModels.push(model);
                        World.lastAddedModel = model;
                        this.instantTrackable.drawables.addCamDrawable(model);
                    }
                },

                isTracking: function isTrackingFn() {
                    return (this.tracker.state === AR.InstantTrackerState.TRACKING);
                },

    /* Called to inject new POI data. */
    loadPoisFromJsonData: function loadPoisFromJsonDataFn(poiData/*, latitude, longitude*/) {
        PoiRadar.show();
        $('#radarContainer').unbind('click');
        $("#radarContainer").click(PoiRadar.clickedRadar);

        AR.logger.debug(poiData.length);
        /* Empty list of visible markers. */
        World.markerList = [];
        World.singlePoiList = [];

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
                "name": poiData[currentPlaceNr].name,
                "description": poiData[currentPlaceNr].description,
                "scale": poiData[currentPlaceNr].scale,
                "rotate": poiData[currentPlaceNr].rotate,
                "translate": poiData[currentPlaceNr].translate,
                "model": poiData[currentPlaceNr].model,
                "shortcut": poiData[currentPlaceNr].shortcut
            };

            World.markerList.push(new Marker(singlePoi));
            World.singlePoiList.push(singlePoi);

            AR.logger.debug(singlePoi.id);
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

        AR.context.scene.minScalingDistance = 20;
        AR.context.scene.maxScalingDistance = 200;
        AR.context.scene.scalingFactor = 0.2;

        //AR.context.scene.cullingDistance = 3000000;

        //World.showUserMessage("cullingDistance=" + AR.context.scene.cullingDistance + " minScalingDistance=" + AR.context.scene.minScalingDistance + " maxScalingDistance=" + AR.context.scene.maxScalingDistance + " ScalingFactor=" + AR.context.scene.scalingFactor);
    },

    /* Request POI data. */
    requestDataFromLocal: function requestDataFromLocalFn(lat, lon) {

        AR.platform.sendJSONObject({
            action: "load_poi_list",
        });
    },

    loadExistingPoiList: function requestDataFromLocalFn(jsonData){

        AR.logger.debug(jsonData);
        if (jsonData == undefined || jsonData == null)
            World.loadPoisFromJsonData(myJsonData);
        else
            World.loadPoisFromJsonData(jsonData);
    },

    openModal: function openModalFn(pic){
        AR.logger.debug(pic.src);
        AR.logger.debug($("#viewImg").attr("src"));
        if (World.isImgListItemVisible == true && pic.src == $("#viewImg").attr("src")) {
          World.closeModal();
        }
        else {
            $("#viewerPic").css('display', 'block');
            $("#viewImg").attr("src", pic.src);
            $("#caption").innerHTML = pic.alt;

            World.isImgListItemVisible = true;
        }
    },

    closeModal: function closeModalFn(){
        AR.logger.debug('closeModalFn');
        $("#viewerPic").css('display', 'none');

        World.isImgListItemVisible = false;
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

        /* Store user's current location in World.userLocation, so you always know where user is.*/
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

        if (World.targetGeoObject != null){
            World.stateOnDistance();
        }

        /* Helper used to update placemark information every now and then (e.g. every 10 location upadtes fired). */
        World.locationUpdateCounter =
            (++World.locationUpdateCounter % World.updatePlacemarkDistancesEveryXLocationUpdates);
    },

    // отслеживаем гео пользователя, если близко то показываем модель, если далеко, то показываем poi
    stateOnDistance: function stateOnDistanceFn() {
            var distance = World.selectedMarker.distanceToUser;

            //if (World.prevDistance == -1.0 || ((Math.abs(World.prevDistance - distance) < 20) && (Math.abs(World.prevDistance - distance) > 1))) {
                if (distance < World.nearDistance)
                {
                    //if (World.targetGeoObject != null) {
                        if (World.targetGeoObject.enabled != true)
                        {
                            World.targetGeoObject.enabled = true;
                            World.targetGeoObject.drawables.indicator[0].enabled = true;
                            World.selectedMarker.markerObject.enabled = false;

                            if (World.selectedMarker.poiData.model == "") {
                                World.showImgIndicator();
                            }

                            AR.logger.debug('Мы рядом с целью!');
                        }
                    //}
                    /*else
                    {
                        if (World.isImgListItemVisible == false)
                        {
                            World.showImgIndicator();
                            World.selectedMarker.markerObject.enabled = false;

                            AR.logger.debug('Мы рядом с целью!');
                        }
                    }*/
                }
                else
                {
                    if (World.selectedMarker.markerObject.enabled != true)
                    {
                        //if (World.targetGeoObject != null) {
                            World.targetGeoObject.enabled = false;
                            World.targetGeoObject.drawables.indicator[0].enabled = false;
                            World.selectedMarker.markerObject.enabled = true;

                            if (World.selectedMarker.poiData.model == "") {
                                World.hideImgIndicator();
                            }
                        //}
                        /*else
                        {
                            World.hideImgIndicator();
                            World.selectedMarker.markerObject.enabled = true;
                        }*/

                        AR.logger.debug('Мы не рядом с целью!');
                    }
                }

                World.prevDistance = World.selectedMarker.distanceToUser;

                World.showUserMessage(World.formatNum(distance, 0) + 'm to ' + World.selectedMarker.poiData.description + ' (lat=' + World.formatNum(World.userLocation.latitude, 4) + ' lon=' + World.formatNum(World.userLocation.longitude, 4) + ')');
            //}
            //else if (Math.abs(World.prevDistance - distance) < 1) {
            //    World.prevDistance = World.selectedMarker.distanceToUser;
            //}
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
    /* Deselect previous marker. */
    //if (World.selectedMarkerID != -1) {
    //    if (World.selectedMarkerID == marker.poiData.id) {
    //        return;
    //    }
    //}
        /* Highlight current one. */
        marker.setSelected(marker);
        World.selectedMarkerID = marker.poiData.id;
        //World.currentMarker = marker;

        AR.logger.debug(marker.isSelected);
        /*
            In this sample a POI detail panel appears when pressing a cam-marker (the blue box with title &
            description), compare index.html in the sample's directory.
        */
        /* Update panel values. */
        $("#poi-detail-title").html(marker.poiData.title);
        $("#poi-detail-description").html(marker.poiData.description);
        $("#poi-detail-shortcut").attr("src", marker.poiData.shortcut);

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
        $("#panel-poidetail").panel("open");

        $(".ui-panel-dismiss").unbind("mousedown");
    },

    /* User clicked "Navigate" button in POI-detail panel -> fire event to open native screen. */
    onCloseButtonClicked: function onCloseButtonClickedFn() {
        for (var i = 0; i < World.markerList.length; i++) {
            var item = World.markerList[i];

            if (item.poiData.id == World.selectedMarkerID){
                item.setDeselected(item);
                break;
            }
        }

        $("#panel-poidetail").panel("close");
    },

    /* User clicked "Navigate" button in POI-detail panel -> fire event to open native screen. */
    onPoiNavigateButtonClicked: function onPoiNavigateButtonClickedFn() {
        if (World.selectedMarker != null) {
            World.selectedMarker.setDeselected(World.selectedMarker);

            if(World.targetGeoObject != null){
                World.targetGeoObject.drawables.cam[0].destroy();
                World.targetGeoObject = null;
            }

            World.selectedMarker.markerObject.enabled = true;
        }

        World.findSelectedMarker();

        //$("#poi-imgIndicator").attr("src", World.selectedMarker.poiData.shortcut);

        //if (World.selectedMarker.poiData.model != "")
            World.createModelAtLocation(World.selectedMarker);

        World.stateOnDistance();

        $("#panel-poidetail").panel("close");

        $("#footerDivButton").css('visibility', 'visible'); // Для скрытия
        //$("#popupSettingsButton").css('visibility', 'visible'); // Для показа
        //$("#resetNavigateButton").css('visibility', 'visible'); // Для показа

        World.isMarkerSelected = true;
    },

    showImgIndicator: function showImgIndicatorFn() {
        //if (World.isMarkerSelected) {
            $("#imgListItem").css('visibility', 'visible'); // Для показа
            //World.isImgListItemVisible = true;
        //}
    },

    hideImgIndicator: function hideImgIndicatorFn() {
        //if (World.isMarkerSelected) {
            $("#imgListItem").css('visibility', 'hidden'); // Для скрытия
            //World.isImgListItemVisible = false;
        //}
    },


     findSelectedMarker: function findSelectedMarkerFn() {
        for (var i = 0; i < World.markerList.length; i++) {
            var item = World.markerList[i];

            if (item.poiData.id == World.selectedMarkerID){
                World.selectedMarker = item;
                World.selectedMarker.setSelected(World.selectedMarker);
            }
        }
     },

    onSettingsOpenButtonClicked: function onSettingsOpenButtonClickedFn() {
         if (World.selectedMarker != null) {
            $("#panel-settings").panel("open");

//            $("#latitude").val(World.formatNum(World.selectedMarker.poiData.latitude, 4);
//            $("#longitude").val(World.formatNum(World.selectedMarker.poiData.longitude, 4);
//            $("#altitude").val(World.selectedMarker.poiData.altitude);
            $("#latitude").val(World.formatNum(World.selectedMarker.poiData.latitude, 4));
            $("#longitude").val(World.formatNum(World.selectedMarker.poiData.longitude, 4));

            var scaleXYZ = World.selectedMarker.poiData.scale.split(',');
            var rotateXYZ = World.selectedMarker.poiData.rotate.split(',');
            var translateXYZ = World.selectedMarker.poiData.translate.split(',');

            $("#translateX").val(translateXYZ[0]);
            $("#translateY").val(translateXYZ[1]);
            $("#translateZ").val(translateXYZ[2]);

//            $("#rotateX").val(rotateXYZ[0]);
            $("#rotateY").val(rotateXYZ[1]);
//            $("#rotateZ").val(rotateXYZ[2]);

//            $("#scaleX").val(scaleXYZ[0]);
//            $("#scaleY").val(scaleXYZ[1]);
//            $("#scaleZ").val(scaleXYZ[2]);
            $("#scaleM").val(scaleXYZ[0]);
         }
    },

    onSettingsSaveButtonClicked: function onSettingsSaveButtonClickedFn() {
        if (World.selectedMarker != null) {
            World.selectedMarker.markerObject.locations[0].latitude = parseFloat($("#latitude").val());
            World.selectedMarker.markerObject.locations[0].longitude = parseFloat($("#longitude").val());
//            World.selectedMarker.markerObject.locations[0].altitude = parseFloat($("#altitude").val());

            World.selectedMarker.poiData.latitude = parseFloat($("#latitude").val());
            World.selectedMarker.poiData.longitude = parseFloat($("#longitude").val());
//            World.selectedMarker.poiData.altitude = parseFloat($("#altitude").val());


            World.selectedMarker.poiData.translate = $("#translateX").val() + "," + $("#translateY").val() + "," + $("#translateZ").val();

            World.selectedMarker.poiData.rotate = "0" + "," + $("#rotateY").val() + "," + "0";

            var scaleM = $("#scaleM").val();
            World.selectedMarker.poiData.scale = scaleM + "," + scaleM + "," + scaleM;


            World.selectedMarker.distanceToUser = World.selectedMarker.markerObject.locations[0].distanceToUser();

            if (World.targetGeoObject != null) {
                World.targetGeoObject.locations[0].latitude = parseFloat($("#latitude").val());
                World.targetGeoObject.locations[0].longitude = parseFloat($("#longitude").val());
                //World.targetGeoObject.locations[0].altitude = parseFloat($("#altitude").val());

                World.targetGeoObject.drawables.cam[0].translate.x = parseFloat($("#translateX").val());
                World.targetGeoObject.drawables.cam[0].translate.y = parseFloat($("#translateY").val());
                World.targetGeoObject.drawables.cam[0].translate.z = parseFloat($("#translateZ").val());

                World.targetGeoObject.drawables.cam[0].rotate.x = 0;
                World.targetGeoObject.drawables.cam[0].rotate.y = parseFloat($("#rotateY").val());
                World.targetGeoObject.drawables.cam[0].rotate.z = 0;

                World.targetGeoObject.drawables.cam[0].scale.x = parseFloat(scaleM);
                World.targetGeoObject.drawables.cam[0].scale.y = parseFloat(scaleM);
                World.targetGeoObject.drawables.cam[0].scale.z = parseFloat(scaleM);
            }

            World.stateOnDistance();

            AR.platform.sendJSONObject({
                action: "save_poi_list",
                singlePoiList: JSON.stringify(World.singlePoiList, null, '\t')
            });
         }

        $("#panel-settings").panel("close");
    },

    onSettingsCancelButtonClicked: function onSettingsCancelButtonClickedFn() {
        $("#panel-settings").panel("close");
    },

    onSettingsDefaultButtonClicked: function onSettingsDefaultButtonClickedFn() {
        $("#translateX").val(0);
        $("#translateY").val(0);
        $("#translateZ").val(0);

        $("#rotateY").val(0);

        $("#scaleM").val(1);

//        World.onSettingsSaveButtonClicked();
    },

    // Screen was clicked but no geo-object was hit.
    // Убрать выделенные метки, скрыть модель
    //onScreenClick: function onScreenClickFn() {
    //},

    resetNavigate: function resetNavigateFn() {
            if(World.targetGeoObject != null){
                if (World.selectedMarker.poiData.model != "")
                    World.targetGeoObject.drawables.cam[0].destroy();
                else {
                    World.hideImgIndicator();
                    World.closeModal();
                }

                World.targetGeoObject.drawables.indicator[0].destroy();

                World.targetGeoObject = null;
            }

            if (World.selectedMarker != null) {
                World.selectedMarker.markerObject.enabled = true;
                World.selectedMarker.setDeselected(World.selectedMarker);
            }

            //World.selectedMarkerID = -1;

            World.showUserMessage('Select POI to navigate');

            $("#footerDivButton").css('visibility', 'hidden'); // Для скрытия
            //$("#popupSettingsButton").css('visibility', 'hidden'); // Для скрытия
            //$("#resetNavigateButton").css('visibility', 'hidden'); // Для скрытия

            World.isMarkerSelected = false;
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

AR.hardware.smart.onPlatformAssistedTrackingAvailabilityChanged = function(availability) {
    switch (availability) {
        case AR.hardware.smart.SmartAvailability.INDETERMINATE_QUERY_FAILED:
            /* Query failed for some reason; try again or accept the fact. */
            World.showUserInstructions("Could not determine if platform assisted tracking is supported.<br>" +
                "Running without platform assisted tracking (ARKit or ARCore).");
            World.createOverlays();
            break;
        case AR.hardware.smart.SmartAvailability.CHECKING_QUERY_ONGOING:
            /* Query currently ongoing; be patient and do nothing or inform the user about the ongoing process. */
            break;
        case AR.hardware.smart.SmartAvailability.UNSUPPORTED:
            /* Not supported, create the scene now without platform assisted tracking enabled. */
            World.showUserInstructions("Running without platform assisted tracking (ARKit or ARCore).");
            World.createOverlays();
            break;
        case AR.hardware.smart.SmartAvailability.SUPPORTED_UPDATE_REQUIRED:
        case AR.hardware.smart.SmartAvailability.SUPPORTED:
            /*
                Supported, create the scene now with platform assisted tracking enabled SUPPORTED_UPDATE_REQUIRED
                may be followed by SUPPORTED, make sure not to create the scene twice (see check in createOverlays).
             */
            World.platformAssisstedTrackingSupported = true;
            World.showUserInstructions("Running with platform assisted tracking(ARKit or ARCore). <br> " +
                "Move your phone around until the crosshair turns green, which is when you can start tracking.");
            World.createOverlays();
            break;
    }
};

World.init();

/* Forward locationChanges to custom function. */
AR.context.onLocationChanged = World.locationChanged;

/* Forward clicks in empty area to World. */
AR.context.onScreenClick = World.onScreenClick;