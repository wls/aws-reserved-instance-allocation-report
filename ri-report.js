var PassThrough = require('stream').PassThrough;  // https://github.com/substack/stream-handbook

var Promise = require('bluebird');  // http://bluebirdjs.com/
var _ = require('underscore');      // http://underscorejs.org/


var AWS = require('aws-sdk');

var region = process.argv[2] || 'us-east-1';

var ec2 = new AWS.EC2({ apiVersion: '2016-11-15', region: region });

var renderHTMLReport = require('./renderHTMLReport.js').renderHTMLReport; // Our own modules
var buildKey = require("./buildKey.js").buildKey;

var describeReservedInstances = Promise.promisify( ec2.describeReservedInstances.bind(ec2) ); // Must bind to this https://github.com/aws/aws-sdj-js/issues/278
var describeInstances = Promise.promisify( ec2.describeInstances.bind(ec2) ); // Must bind to this https://github.com/aws/aws-sdj-js/issues/278


var describeReservedInstancesParams = {
  Filters: [
    {
      Name: 'state',
      Values: [ 'active' ]
    }
  ]
};

var describeInstancesParams = {
  Filters: [
    {
      Name: 'instance-state-name',
      Values: [ 'running' ]
    }
  ]
};




function analyzeUsage( reservedInstancesObj, instancesObj ) {

  // RESERVED INSTANCES
  var reservedInstances = reservedInstancesObj.ReservedInstances;

  // Build the reserved matrix
  var reservedMatrix = [];
    _.each( reservedInstances, function(x) {
      var key = buildKey(x.InstanceType, x.AvailabilityZone);
      reservedMatrix[ key ] = ( reservedMatrix[ key ] || 0 ) + x.InstanceCount;
  });


  // RUNNING INSTANCES
  var runningInstances  = _.chain(instancesObj.Reservations).map( (x) => x.Instances ).flatten().value();

  // Build the usage matrix
  var usageMatrix = [];
    _.each( runningInstances, function(x) {
      var key = buildKey( x.InstanceType, x.Placement.AvailabilityZone);
      usageMatrix[ key ] = ( usageMatrix[ key ] || 0 ) + 1;  // Count each machine used
  });


  // Compute the unique zones and types
  var reservedZones     = _.map(reservedInstances, (x) => x.AvailabilityZone );
  var reservedTypes     = _.map(reservedInstances, (x) => x.InstanceType     );

  var runningZones      = _.map(runningInstances, (x) => x.Placement.AvailabilityZone);
  var runningTypes      = _.map(runningInstances, (x) => x.InstanceType     );

  var zones = _.chain( _.union(reservedZones, runningZones) ).uniq(false).sort().value();
  var types = _.chain( _.union(reservedTypes, runningTypes) ).uniq(false).sort().value();


  return {
    AvailabilityZones : zones,
    InstanceTypes : types,
    ReservedMatrix : reservedMatrix,
    UsageMatrix: usageMatrix
  };

}





// Call both AWS APIs to get the data we need, and continue when both are completed successfully.
var collectData = [
    describeReservedInstances(describeReservedInstancesParams),
    describeInstances(describeInstancesParams)
];
Promise.all(collectData)
  .then( function (values) {
     var reservedInstances = values[0];
     var instances = values[1];
     var completedAnalysis = analyzeUsage( reservedInstances, instances );
     //console.dir(completedAnalysis);
     var stream = renderHTMLReport(completedAnalysis);
     stream.pipe( process.stdout );
   } )
  .catch( function(e) {
    console.log(e.message);
    process.exit(1);
  } );
