var PassThrough = require('stream').PassThrough;  // https://github.com/substack/stream-handbook

var datetime = require('node-datetime');

var buildKey = require("./buildKey.js").buildKey;


let SVG_WarningSign = '<svg xmlns="http://www.w3.org/2000/svg" font-size="12" width="30" height="30" style="color-interpolation:auto;color-rendering:auto;font-family:Dialog;font-size:10px;image-rendering:auto;shape-rendering:auto;stroke:#000;text-rendering:auto"><path d="m3.2 30q-1.2 0-1.9-0.3-0.7-0.3-1-0.8-0.3-0.5-0.3-1.2 0-0.3 0.1-0.9 0.1-0.6 0.6-1.5L12.2 2.8q0.4-0.7 0.9-1.4 0.5-0.7 1-1 0.5-0.3 0.9-0.3 0.4 0 0.9 0.3 0.5 0.3 1 1 0.5 0.7 0.9 1.4l11.5 22.5q0.4 0.9 0.6 1.5 0.1 0.6 0.1 0.9 0 0.6-0.3 1.2-0.3 0.5-1 0.8-0.6 0.3-1.9 0.3l-23.5 0zm0-1.6 23.5 0q0.7 0 1-0.2 0.3-0.2 0.5-0.5 0.2-0.3 0.2-0.8 0-0.5-0.4-1.2L16.6 3.3Q16.3 2.8 16.1 2.4 15.8 2.1 15.6 1.9 15.3 1.7 15 1.7q-0.3 0-0.6 0.2-0.3 0.2-0.5 0.6-0.2 0.4-0.5 0.9L2 25.8q-0.4 0.7-0.4 1.2 0 0.5 0.2 0.8 0.2 0.3 0.5 0.5 0.3 0.2 1 0.2zM15 27.2q-0.5 0-0.8-0.2-0.3-0.2-0.5-0.6-0.2-0.4-0.2-1 0-0.6 0.2-1 0.2-0.4 0.5-0.6 0.3-0.2 0.8-0.2 0.5 0 0.8 0.2 0.3 0.2 0.5 0.6 0.2 0.4 0.2 1 0 0.6-0.2 1-0.2 0.4-0.5 0.6-0.3 0.2-0.8 0.2zM14.5 21.6Q12.9 15.9 12.9 11.6l0-3q0.2-3.1 2.1-3.7 1.9 0.6 2.1 3.7l0 3q0 4.3-1.6 10l-1 0z" stroke-width="0.1"/></svg>';

function renderHTMLReport(analysisData) { // return a stream with the table

  var AvailabilityZones = analysisData.AvailabilityZones;
  var InstanceTypes = analysisData.InstanceTypes;
  var ReservedMatrix = analysisData.ReservedMatrix;
  var UsageMatrix = analysisData.UsageMatrix;

  //console.log(AvailabilityZones);
  //console.log(ReservedMatrix);
  //console.log(UsageMatrix);

  var s = new PassThrough;

  // Helpers
  function tableStart() { s.push( "<TABLE BORDER='1' WIDTH='100%'>"); }
  function tableEnd() { s.push( "</TABLE>\n"); }
  function trStart() { s.push( "<TR ALIGN='CENTER' VALIGN='MIDDLE'>"); }
  function trEnd() { s.push( "</TR>\n"); }
  function td(str) { s.push( "<TD>" + str + "</TD>"); }

  function lookUpCounts( type, zone ) {
    var key = buildKey( type, zone );
    var reservedCount = ReservedMatrix[key] || 0;
    var usageCount = UsageMatrix[key] || 0;

    return {
      usageCount : usageCount,
      reservedCount : reservedCount
    };
  }


  function isUnusedReserved(type) {

    for (var zone of AvailabilityZones) {
      var counts = lookUpCounts( type, zone );
      if ( counts.usageCount < counts.reservedCount ) return true;
    }
    return false;

  }


  function drawUsage( type, zone ) {
    var counts = lookUpCounts( type, zone );

    var RC = counts.reservedCount;
    var UC = counts.usageCount;

    var totalBlocks = Math.max( UC, RC );

    var response = "";
    for ( i = 1; i < totalBlocks + 1; ++i ) {
      var status = 'unused'; // detect logic error

      if ( i <= RC ) {

        if ( i > UC && UC <= RC ) status = 'unused';      // WASTING UNALLOCATED RESOURCES
          else status = 'allocated';                      // ALLOCATED WELL USING RESERVED INSTANCES

      } else status = 'overrun';                          // UNOPTIMIZAL INSTANCES

      response += "<DIV CLASS=\"block " + status + "\"></DIV>";
    }

    response += "<P STYLE='clear: both;'>" + UC + " used / " + RC + " reserved</P>\n";

    return response;
  }

  // START PAGE
  s.push(
    "<HTML>\n" +
    "<HEAD>\n" +
    "  <TITLE>Usage Allocation</TITLE>\n" +
    "<STYLE>\n" +
    "DIV.block { width: 25; height: 25; border: thin solid black; margin: 10px; float: left; }\n" +
    ".unused { background-color: grey; }\n" +
    ".overrun { background-color: red}\n" +
    ".allocated { background-color: green}\n" +
    ".center { text-align: center; }\n" +
    "</STYLE>\n" +
    "</HEAD>" +
    "<BODY>\n" +
    "<DIV CLASS=\"center\">" + datetime.create().format('Y-m-d H:M:S') + "</DIV>\n"
  );


  // TABLE BEGIN
  tableStart();

  // Headers
  trStart();
  td("");
  var colwidth = 90.0 / AvailabilityZones.length;
  for (var availabilityZone of AvailabilityZones) {
    // td( availabilityZone );
    s.push( "<TD WIDTH=\"" + colwidth + "%\">" + availabilityZone + "</TD>" );
  }
  trEnd();

  for (var instanceType of InstanceTypes) {
    trStart();

    if ( isUnusedReserved(instanceType) ) td( instanceType + "<br/>" + SVG_WarningSign);
      else td( instanceType );

    for (var availabilityZone of AvailabilityZones) {
      td( drawUsage(instanceType, availabilityZone) );
    }

    trEnd();
  }

  tableEnd();
  // TABLE END

  // START PAGE
  s.push(
    "</BODY>\n" +
    "</HTML>\n"
  );

  return s;

}


exports.renderHTMLReport = renderHTMLReport;
