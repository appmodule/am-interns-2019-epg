var parser = require('fast-xml-parser')
var he = require('he')
var express = require('express')
var fs = require('fs')
var bodyParser = require('body-parser')
var { xmlFileRead, jsonFileWrite, jsonChannelsFile, jsonEventsFile } = require('./config.js')

function parsing (eventsXml) {
  var app = express()
  // var xmlData = fs.readFileSync(xmlFileRead).toString()
  var xmlData = fs.readFileSync(eventsXml).toString()

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
  return jsonObj
}
function getChannels (jsonObj) {
  var jsonChannels = jsonObj.tv.channel
  return jsonChannels
}
async function getProgramms (jsonObj) {
  var jsonProgramms = jsonObj.tv.programme

  /* Write json to file */
  // fs.writeFile(jsonFileWrite, JSON.stringify(jsonObj, null, 2), function (err) {
  //   if (err) {
  //     return console.log(err)
  //   }
  // })

  var dataJson = JSON.stringify(jsonObj, null, 2)

  const writePromise = (jsonFileWrite, dataJson) => {
    return new Promise((resolve, reject) => {
      fs.writeFile(jsonFileWrite, dataJson, err => {
        if (err) {
          reject(err)
        }
        resolve('Success')
      })
    })
  }

  await writePromise(jsonFileWrite, dataJson)

  const programmeArr = []

  jsonProgramms.forEach((element) => {
    /// //////////////////////////////////////////////////////////////
    // Date format in xml files is '20190803015000 +0000'/////////////
    /// ///////////////////////////'YYYYMMDDHHmmSS (+/-)HHmm'/////////
    /// //////////////////////////////////////////Last part is GMT////
    /// //////////////////////////////////////////////////////////////

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

    var startTimestamp = new Date(Date.UTC(yearStart, monthStart - 1 /* Months starts at 0 */, dayStart, hourStart, minuteStart, secondStart, ms)).getTime()

    var startDate = yearStart + '-' + monthStart + '-' + dayStart + ' ' + hourStart + ':' + minuteStart + ':' + secondStart
    // Date format must be as in database YYYY-MM-DD HH:mm:SS

    // timestamp must be universal for all timezones
    if (signStart === '+') {
      startTimestamp += timeZoneStart * 3600000 // 1h=3,600,000ms
    } else {
      startTimestamp -= timeZoneStart * 3600000
    }
    var stopTimestamp = new Date(Date.UTC(yearStop, monthStop - 1, dayStop, hourStop, minuteStop, secondStop, ms)).getTime()
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

  jsonProgramms = programmeArr
  return jsonProgramms
}

// module.exports = { jsonChannels, jsonProgramms }
module.exports = { parsing, getChannels, getProgramms }
