﻿/*
todo:
    -   meet here
    -   km markers
    -   elevation graph
    -   key indicators - water, toilets, lookout/photo, carpark
    -   download gpx
    -   terrain indicators
    -   diversion polylines
    -   after run info
    -   calendar + meet time + link to meetup
    -   (v2) submit your run

*/

/*
Get a latitude and longitude for an address here: https://www.gps-coordinates.net/
Convert a strava activity to a GPX with this bookmarklet: https://mapstogpx.com/strava/
Generate a randomized id here: https://passwordsgenerator.net/ (8 character, alpha)
Name the gpx file $id.gpx and copy the template json blob into the array, fill out the details
*/

/*
        {
            "id": "abcABC",
            "name": "",
            "description": "Line1\r\nLine2",
            "meetingPoint": {
                "label": "",
                "latitude": -36.0,
                "longitude": 174.0
            },
            "mapDefaults": {
              "center": {
                "latitude": -36.848448,
                "longitude": 174.762191
              },
              "zoom": 12
            },
            "distanceOptions": [
                0,
                0,
            ]
        },
    */

var app = angular.module('routesApp', ['uiGmapgoogle-maps', 'ngSanitize']);
//configure google maps library (including api key)
app.config(function (uiGmapGoogleMapApiProvider) {
    uiGmapGoogleMapApiProvider.configure({
        key: 'AIzaSyDeWHf1yBGiJgWoaQH_PEN2bnwZ2aCFSbE',
        v: '3.29', //defaults to latest 3.X anyhow
        libraries: 'geometry,visualization'
    });
})
app.filter('br', function () {
    return function (text) {
        return text.replace(/\r?\n/g, '<br/>');
    }
});

app.controller('routesController', function ($scope, $http, uiGmapGoogleMapApi) {
    $scope.markers = [];
    $scope.map = {
        options: {
            fullscreenControl: true
        },
        events: {
            polylineComplete: function () {
                console.log('polylineComplete');
            },
            tilesloaded: function (map) {
                $scope.$apply(function () {
                    console.log('fetched map instance', map, route);
                    var id = jQuery(map.getDiv()).closest('.map-container').data('route-id');
                    var route = _.find($scope.data, function (item) { return item.id === id; });
                    console.log('route', route);

                    var url = 'routes/' + id + '.gpx';
                    console.log('loading ' + url);
                    $http(
                        {
                            method: 'get',
                            url: url,
                            transformResponse: function (data) {
                                // string -> XML document object
                                return $.parseXML(data);
                            }
                        }).then(function (transport) {
                            var data = transport.data;
                            console.log('loaded ' + url, data);
                            route.gpx = data;
                            console.log('gpx', data);
                            var parser = new GPXParser(data, map);
                            parser.setTrackColour("#20bc5c");     // Set the track line colour
                            parser.setTrackWidth(3);          // Set the track line width
                            parser.setMinTrackPointDelta(0.001);      // Set the minimum distance between track points
                            parser.centerAndZoom(data);
                            var polylines = parser.addTrackpointsToMap();         // Add the trackpoints
                            parser.addRoutepointsToMap();         // Add the routepoints
                            parser.addWaypointsToMap();           // Add the waypoints

                            var polyline = _.flatten(polylines)[0];

                            //needs to be angularized
                            var markers = [];
                            var lengthInMeters = google.maps.geometry.spherical.computeLength(polyline.getPath());
                            console.log('route length is ', lengthInMeters);
                            for (var i = 1000; i < lengthInMeters; i += 1000) {
                                var km = i / 1000;
                                var point = polyline.GetPointAtDistance(i);
                                if (point) {
                                    markers.push({ id: km, latitude: point.lat(), longitude: point.lng(), title: km + 'km', zIndex: km })
                                }
                            }                            route.markers = markers;                            console.log('markers', markers);                            //console.log($scope.markers);                            route.loading = false;


                        });

                });
            }
        }
    }
    // uiGmapGoogleMapApi is a promise.
    // The "then" callback function provides the google.maps object.
    uiGmapGoogleMapApi.then(function (maps) {
        console.log('google maps api ready');
        initializePolylineHelpers();
        //console.log(maps);
        //fetch route data from external json file
        $http.get('routes/db.json')
            .then(function (res) {
                //store in scope
                console.log('route data loaded');
                $scope.data = res.data;
                for (var i = 0; i < $scope.data.length; i++) {
                    $scope.data[i].loading = true;
                }
            });
    });
});
