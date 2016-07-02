'use strict';

var dashboardApp = angular.module('dashboardApp', ['ngAnimate']);

// region bg colors
const colors = [
    "bg-navy",
    "bg-blue",
    "bg-aqua",
    "bg-teal",
    "bg-olive",
    "bg-green",
    "bg-lime",
    "bg-yellow",
    "bg-orange",
    "bg-red",
    "bg-maroon",
    "bg-fuchsia",
    "bg-purple",
    "bg-black",
    "bg-silver",
    "bg-gray"
];

const eventRowTmpl = `
<div class="jumbotron" ng-model="event">
    <div class="jumbotron-contents">
        <div class="row">
            <div class="col-sm-1 log-img">
                <i class="fa fa-scissors fa-2x" ng-if="event.code == 1"></i>
                <i class="fa fa-exchange fa-2x" ng-if="event.code == 2 && event.status !=2"></i>
                <i class="fa fa-check fa-2x bg-blue" ng-if="event.code == 2 && event.status ==2"></i>
                <i class="fa fa-refresh fa-2x" ng-if="event.code == 3 && event.status !=2"></i>
                <i class="fa fa-check fa-2x bg-green" ng-if="event.code == 3 && event.status ==2"></i>
                <i class="fa fa-trash fa-2x" ng-if="event.code == 4 && event.status !=2"></i>
                <i class="fa fa-check fa-2x bg-red" ng-if="event.code == 4 && event.status ==2"></i>
            </div>
            <div class="col-md-10 log-msg">

                <!-- split message -->
                <div ng-if="event.code == 1">
                    Split
                    <span class="label {{ colors[event.split_event.region % colors.length] }}">Region {{ event.split_event.region  }}</span> into
                    <span class="label {{ colors[event.split_event.left % colors.length] }}">Region {{ event.split_event.left }}</span> and
                    <span class="label {{ colors[event.split_event.right % colors.length] }}">Region {{ event.split_event.right }}</span>
                </div>

                <!-- leader transfer message -->
                <div ng-if="event.code == 2">
                    Transfer leadership of
                    <span class="label {{ colors[event.transfer_leader_event.region % colors.length] }}">Region {{ event.transfer_leader_event.region }}</span> from 
                    <b>Node {{ event.transfer_leader_event.store_from }}</b> to <b> Node {{ event.transfer_leader_event.store_to }}</b>
                    <label ng-if="event.status == 2" class="label label-success">Finished</label>
                </div>

                <!-- add replica message -->
                <div ng-if="event.code == 3">
                    Add Replica for <span class="label {{ colors[event.add_replica_event.region % colors.length] }}"> Region {{ event.add_replica_event.region }}</span> 
                    to <b> Node {{ event.add_replica_event.store }}</b>
                    <label ng-if="event.status == 2" class="label label-success">Finished</label>
                </div>

                <!-- remove replica message -->
                <div ng-if="event.code == 4">
                    Remove Replica for <span class="label {{ colors[event.remove_replica_event.region % colors.length] }}"> Region {{ event.remove_replica_event.region }}</span> 
                    from <b> Node {{ event.remove_replica_event.store }}</b>
                    <label ng-if="event.status == 2" class="label label-success">Finished</label>
                </div>


            </div>
        </div>
    </div>
</div>
`;

dashboardApp.directive('eventRow', function() {
    return {
        restrict: 'AE',
        scope: {
            event: '=',
            colors: '='
        },
        replace: 'true',
        template: eventRowTmpl
    };
});


dashboardApp.controller('LogEventController', function LogEventController($scope, $timeout) {

    $scope.colors = colors;
    $scope.logs = [];

    $scope.init = function(wsHost) {
            var ws = new WebSocket("ws://" + wsHost + "/ws");

            ws.onopen = function(evt) {
            }

            ws.onclose = function(evt) {
                ws = null;
            }

            ws.onmessage = function(evt) {
                console.log(evt.data);
                $scope.$apply(function () {
                    var data = JSON.parse(evt.data);
                    $scope.logs.unshift(data);

                    if ($scope.logs.length > 2000) {
                        $scope.logs.pop();
                    }
                });
            }

            ws.onerror = function(evt) {
            }
    };

});
