var parser = require('fast-xml-parser')
var he = require('he')
var express = require('express')
var fs = require('fs')
var bodyParser = require('body-parser')
var { xmlFileRead, jsonFileWrite, jsonChannelsFile, jsonEventsFile } = require('./config.js')

/* This section is used for date formating */
Number.padLeft = function (base, chr) {
  var len = (String(base || 10).length - String(this).length) + 1
  return len > 0 ? new Array(len).join(chr || '0') + this : this
}

var app = express()
var xmlData = fs.readFileSync(xmlFileRead).toString()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
  extended: true
}))
/* Options for setting fast xml parser, change only if the xml data formats are changed */
var options = {
  attributeNamePrefix: '@',
  attrNodeName: false, // default is 'false'
  textNodeName: 'text',
  ignoreAttributes: false,
  ignoreNameSpace: false,
  allowBooleanAttributes: false,
  parseNodeValue: true,
  parseAttributeValue: true,
  trimValues: true,
  cdataTagName: '__cdata', // default is 'false'
  cdataPositionChar: '\\c',
  localeRange: '', // To support non english character in tag/attribute values.
  parseTrueNumberOnly: false,
  attrValueProcessor: a => he.decode(a, { isAttributeValue: true }), // default is a=>a
  tagValueProcessor: a => he.decode(a) // default is a=>a
}

var tObj = parser.getTraversalObj(xmlData, options)
var jsonObj = parser.convertToJson(tObj, options)

var jsonChannels = jsonObj.tv.channel
var jsonProgramms = jsonObj.tv.programme

/* Write json to file */
fs.writeFileSync(jsonFileWrite, JSON.stringify(jsonObj, null, 2), function (err) {
  if (err) {
    return console.log(err)
  }
})

const programmeArr = []

jsonProgramms.forEach((element) => {
/////////////////////////////////////////////////////////////////
//Date format in xml files is '20190803015000 +0000'/////////////
//////////////////////////////'YYYYMMDDHHmmSS (+/-)HHmm'/////////
/////////////////////////////////////////////Last part is GMT////
/////////////////////////////////////////////////////////////////

  // Start time
  var yearStart = element['@start'].substring(0, 4)
  var monthStart = element['@start'].substring(4, 6)
  var dayStart = element['@start'].substring(6, 8)
  var hourStart = element['@start'].substring(8, 10)
  var minuteStart = element['@start'].substring(10, 12)
  var secondStart = element['@start'].substring(12, 14)
  var signStart = element['@start'].substring(15, 16)
  var timeZoneStart = element['@start'].substring(16, 18)

  // End/stop time
  var yearStop = element['@stop'].substring(0, 4)
  var monthStop = element['@stop'].substring(4, 6)
  var dayStop = element['@stop'].substring(6, 8)
  var hourStop = element['@stop'].substring(8, 10)
  var minuteStop = element['@stop'].substring(10, 12)
  var secondStop = element['@stop'].substring(12, 14)
  var signStop = element['@stop'].substring(15, 16)
  var timeZoneStop = element['@stop'].substring(16, 18)

  var ms = 0

  var startTimestamp = new Date(yearStart,
    monthStart - 1 /* Months starts at 0 */, dayStart, hourStart, minuteStart, secondStart, ms).getTime()

  var startDate = yearStart + '-' + monthStart + '-' + dayStart + ' ' + hourStart + ':' + minuteStart + ':' + secondStart
  // Date format must be as in database YYYY-MM-DD HH:mm:SS

  // timestamp must be universal for all timezones
  if (signStart === '+') {
    startTimestamp += timeZoneStart * 3600000 // 1h=3,600,000ms
  } else {
    startTimestamp -= timeZoneStart * 3600000
  }
  var stopTimestamp = new Date(yearStop,
    monthStop - 1, dayStop, hourStop, minuteStop, secondStop, ms).getTime()
  var stopDate = yearStop + '-' + monthStop + '-' + dayStop + ' ' + hourStop + ':' + minuteStop + ':' + secondStop

  if (signStop === '+') {
    stopTimestamp += timeZoneStop * 3600000
  } else {
    stopTimestamp -= timeZoneStop * 3600000
  }
  var tz = 'GMT' + signStart + timeZoneStart

  startTimestamp = new Date(startTimestamp).getTime()

  // Update json element with edited parameters
  element['@start'] = startDate
  element['@stop'] = stopDate
  element.start_timestamp = startTimestamp
  element.stop_timestamp = stopTimestamp
  element.timezone = tz

  // Don't forget the array
  programmeArr.push(element)
})

/* This loop takes care of EPH holes and patches them if they exist, 
  maximum duration of one hole is 1h */
for (let i = 0; i < programmeArr.length - 1; i++) {
// Checks if the end of the first element is the same time as ending of the second element,
// if not, we need to patch the hole. Also check if the two events from the same channel
// because events from multiple channels are in this array
  if (programmeArr[i]['@stop'] !== programmeArr[i + 1]['@start'] &&
        programmeArr[i]['@channel'] === programmeArr[i + 1]['@channel']) {
    const name = programmeArr[i]['@channel']
    // fill in the info for the EPG hole
    const element = {
      '@start': programmeArr[i]['@stop'],
      '@stop': programmeArr[i + 1]['@start'],
      title: {
        text: 'No Channel EPG',
        '@lang': 'no'
      },
      '@channel': name
    }
    const prevStop = programmeArr[i].stop_timestamp
    const nextStart = programmeArr[i + 1].start_timestamp

    element.start_timestamp = prevStop // set start timestamp parameter

    if ((nextStart - prevStop) > 3600000) { // Logic for making hole patches last a maximum of 1h/3,600,000ms
      element.stop_timestamp = prevStop + 3600000 // set stop timestamp parameter
      var d = new Date(element.stop_timestamp)

      const dformat = [d.getFullYear(), (d.getMonth() + 1).padLeft(), d.getDate().padLeft()].join('-') +
            ' ' +
            [d.getHours().padLeft(), d.getMinutes().padLeft(), d.getSeconds().padLeft()].join(':')

      element['@stop'] = dformat // Stop date update is needed here because it wont end when the next one starts
      // which also means there will be more holes after this one
    } else {
      element.stop_timestamp = nextStart // set stop timestamp parameter
    }
    element.timezone = programmeArr[i].timezone // set timezone parameter

    programmeArr.splice(i + 1, 0, element) // filling the No EPG element into the array
  }
}
jsonProgramms = programmeArr

module.exports = { jsonChannels, jsonProgramms }
