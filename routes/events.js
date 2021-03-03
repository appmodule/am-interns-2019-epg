var express = require('express')
var router = express.Router()
var myCache
var mysql = require('mysql')
var Database = require('../databaseclass.js')
// var redis = require('redis')
const redis = require('async-redis')
const config = require('../config.js')
var dotenv = require('dotenv')
dotenv.config()
// var { imgPrefix } = require('../config.js')
var { dbHost, dbUser, dbPassword, dbName, imageFolder, imgPrefix, redisHost } = require('../config.js')

var redisClient = redis.createClient({ host: redisHost, port: 6379 }) // Redis u docker, lokalno localhost
redisClient.on('ready', function () {
  console.log('Redis is ready')
})

redisClient.on('error', function () {
  console.log('Error in Redis')
})

async function fillBlankEpg (epgArray) {
  var database = require('../database.js')
  var db = new Database({
    host: dbHost,
    user: dbUser,
    password: dbPassword,
    database: dbName
  })
  db.connection.connect(async (connectionError) => {
    if (connectionError) {
      throw connectionError
    }
  })
  db.connection.on('error', (err) => {
    console.log(err)
    db.connection.connect(async (connectionError) => {
      if (connectionError) {
        throw connectionError
      }
    })
  })
  for (var epg of epgArray.epg) {
    var chnl = epg.channels
    var i = 0
    for (var ch of chnl) {
      var event = ch.events
      var epgID = ch.epgID
      if (event.length === 0) {
        // console.log('No EPG-s for test')
      } else {
        var j = 0
        for (var ev of event) {
          var z = j + 1
          if (z > event.length - 1) {
            // console.log('Test is finished for EPG: ' + chnl[i].epgID)
          } else {
            var displ = epgID
            var startTimestamp = event[j + 1].str
            var endTimestamp = event[j].fin
            var startTime = (new Date(startTimestamp)).toISOString()
            var endTime = (new Date(endTimestamp)).toISOString()
            var startDate = startTime.toString().replace('T', ' ')
            startDate = startDate.slice(0, 19)
            var endDate = endTime.toString().replace('T', ' ')
            endDate = endDate.slice(0, 19)
            var unknownEvent = 'No EPG'
            if (startTimestamp !== endTimestamp) {
              // console.log('No EPG: ' + chnl[i].epgID + ', Id of event: ' + event[j].id)
              var sql = 'SELECT COUNT(*) as noepg FROM channel_event WHERE timestamp_start = ' + mysql.escape(endTimestamp) + ' AND timestamp_end = ' + mysql.escape(startTimestamp) + ' AND event_name = ' + mysql.escape(unknownEvent) + ' AND channel_display = ' + mysql.escape(displ) + ';'
              var epgres = await db.query(sql)

              if (epgres[0].noepg === 0) {
                sql = 'INSERT INTO channel_event(start, end, timestamp_start, timestamp_end, event_name, timezone, channel_display, lang, description)' +

                  'VALUE (' + mysql.escape(endDate) + ',' + mysql.escape(startDate) + ',' + mysql.escape(endTimestamp) + ',' + mysql.escape(startTimestamp) + ',' + mysql.escape(unknownEvent) + ', "GMT+01", ' + mysql.escape(displ) + ', "en", "");'

                await db.query(sql)
              }
            }
          }
          j++
        }
      }
      i++
    }
  }
  db.close()
}
// ////////////////////////////REST API///////////////////////////////
var sqlAPI
// router.get('/category', (req, res) => { // NOT IN USE
//   sqlAPI = 'SELECT category_type FROM category'
//   db.connection.query(sqlAPI, (error, results, fields) => {
//     if (error) {
//       throw error
//     }
//     return res.send({ error: false, data: results, message: 'categories' })
//   })
// })

router.get('/tv/parse', async (req, res) => {
  config.isParsing = true
  var eventsXml = req.param('file')
  eventsXml = './epg_xml/' + eventsXml
  var database = require('../database.js')
  var db = new Database({
    host: dbHost,
    user: dbUser,
    password: dbPassword,
    database: dbName
  })
  db.connection.connect(async (connectionError) => {
    if (connectionError) {
      throw connectionError
    }
  })
  db.connection.on('error', (err) => {
    console.log(err)
    db.connection.connect(async (connectionError) => {
      if (connectionError) {
        throw connectionError
      }
    })
  })
  database.main(eventsXml)
  return res.json({ message: 'Parsing started' })
})

router.all('/tv/event', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  // var databasepullonly = require('../databasepullonly.js')
  // var db = databasepullonly.db
  let request
  if (req.method === 'POST') {
    request = req.body
  } else if (req.method === 'GET') {
    request = req.query
  } else {
    // res.status(500).json('Unsupported method: ', req.method)
    let error = {
      code: 1,
      desc: 'Unsupported method: ' + req.method
    }
    var data = { epg: [], error }
    return res.send(data)
  }
  if (config.isParsing) {
    let error = {
      code: 1,
      desc: 'Parsing in progress'
    }
    var data = { epg: [], error }
    return res.send(data)
  }

  if (typeof request.time !== 'undefined' || typeof request.epgID !== 'undefined') {
    // time is given in the 'startTime,endtime' format so we need to divide it
    var time = request.time
    if (time[time.length - 1] === ';') {
      time = time.substring(0, time.length - 1)
    }
    const timestamps = time.split(';')
    const tstarts = []
    const tends = []

    for (var timestamp of timestamps) {
      const startEnd = timestamp.split(',')
      tstarts.push(startEnd[0])
      tends.push(startEnd[1])
    }

    // we also get a number of channels whose events we need to extract and they are in the format Channel1;Channel2;Channel3...
    let epgChannels = request.epgID
    if (epgChannels[epgChannels.length - 1] !== ';') {
      epgChannels += ';'
    }
    epgChannels = epgChannels.split(';')
    while (epgChannels.indexOf('') > 0) {
      epgChannels.splice(epgChannels.indexOf(''), 1)
    }

    if (Array.isArray(epgChannels)) {
      var key = epgChannels + time
      let events = ''

      var reply = await redisClient.get(key)
      if (reply === null) {
        console.log('Not in cache')
          // var databasepullonly = require('../databasepullonly.js')
          var db = new Database({
            host: dbHost,
            user: dbUser,
            password: dbPassword,
            database: dbName
          })
          db.connection.connect(async (connectionError) => {
            if (connectionError) {
              throw connectionError
            }
          })
          db.connection.on('error', (err) => {
            console.log(err)
            db.connection.connect(async (connectionError) => {
              if (connectionError) {
                throw connectionError
              }
            })
          })
          for (var j = 0; j < tstarts.length; j++) {
            for (var channel of epgChannels) {
              const sql = `SELECT channel_display, event_name AS tit, subtitle AS subtit, (timestamp_end - timestamp_start) AS lng, timestamp_start AS str, start AS timeStr, end AS timeEnd, timestamp_end AS fin, id, image AS URL, description AS descr, episode_number AS episodeNumber FROM channel_event WHERE channel_display = ${mysql.escape(channel)} AND timestamp_end BETWEEN ${tstarts[j]} AND ${tends[j]} AND timestamp_start BETWEEN ${tstarts[j]} AND ${tends[j]}`
              var rows = await db.query(sql)
              for (var r of rows) {
                var url = r.URL
                var imgURL
                if (url) {
                  imgURL = imgPrefix + url.substr(1)
                } else {
                  imgURL = ''
                }
                events += `${r.tit}~${r.subtit}~${r.lng}~${r.str}~${r.timeStr}~${r.timeEnd}~${r.fin}~${r.id}~${imgURL}~${r.descr}~${r.episodeNumber}{`
              }
              events += '^'
            }
            events += '}'
          }
          db.close()
          await redisClient.set(key, events)
          // var ttl = 60 * 60 * 6 // 6 hours
          // await redisClient.expire(key, ttl) // key expires in 6 hours
          console.log('In cache now')

          reply = events.slice(0, -1)

          var timestampArr = reply.split('}')
          var dataSend = []

          var a = 0
          for (var ts of timestampArr) {
            var ts1 = ts.slice(0, -1)

            var channelArr = ts1.split('^')

            var channelData = []
            var l = 0
            for (var ch of channelArr) {
              if (ch === undefined || ch === null || ch === '') {
                // continue
                channelData.push({ epgID: epgChannels[l], events: [] })
              } else {
                var ch1 = ch.slice(0, -1)

                var eventArr = ch1.split('{')

                var eventData = []
                for (var ev of eventArr) {
                  var eventAttributes = ev.split('~')

                  eventData.push({ tit: eventAttributes[0], subtit: eventAttributes[1], lng: parseInt(eventAttributes[2]), str: parseInt(eventAttributes[3]), timeStr: eventAttributes[4], timeEnd: eventAttributes[5], fin: parseInt(eventAttributes[6]), id: eventAttributes[7], URL: eventAttributes[8], desc: eventAttributes[9], episodeNumber: parseInt(eventAttributes[10]) })
                }
                channelData.push({ epgID: epgChannels[l], events: eventData })
              }
              l++
            }
            dataSend.push({ start: parseInt(tstarts[a]), end: parseInt(tends[a]), channels: channelData })
            a++
          }
          // let error = {
          //   code: err ? 1 : 0,
          //   desc: err ? JSON.stringify(err) : 'Success'
          // }
          // var data = { epg: dataSend, error }
          let error = {
            code: 0,
            desc: 'Success'
          }
          var data = { epg: dataSend, error }
          await fillBlankEpg(data)
          return res.send(data)
      } else {
        console.log('In cache')

          reply = reply.slice(0, -1)
          // var timestampArr = []

          timestampArr = reply.split('}')

          var dataSendCache = []
          a = 0
          for (ts of timestampArr) {
            ts1 = ts.slice(0, -1)

            channelArr = ts1.split('^')

            var channelDataCache = []
            l = 0
            for (ch of channelArr) {
              if (ch === undefined || ch === null || ch === '') {
                // continue
                channelDataCache.push({ epgID: epgChannels[l], events: [] })
              } else {
                ch1 = ch.slice(0, -1)

                eventArr = ch1.split('{')

                var eventDataCache = []
                for (ev of eventArr) {
                  eventAttributes = ev.split('~')

                  eventDataCache.push({ tit: eventAttributes[0], subtit: eventAttributes[1], lng: parseInt(eventAttributes[2]), str: parseInt(eventAttributes[3]), timeStr: eventAttributes[4], timeEnd: eventAttributes[5], fin: parseInt(eventAttributes[6]), id: eventAttributes[7], URL: eventAttributes[8], desc: eventAttributes[9], episodeNumber: parseInt(eventAttributes[10]) })
                }
                channelDataCache.push({ epgID: epgChannels[l], events: eventDataCache })
              }
              l++
            }

            dataSendCache.push({ start: parseInt(tstarts[a]), end: parseInt(tends[a]), channels: channelDataCache })
            a++
          }
          // let error = {
          //   code: err ? 1 : 0,
          //   desc: err ? JSON.stringify(err) : 'Success'
          // }
          // var dataCache = { epg: dataSendCache, error }
          let error = {
            code: 0,
            desc: 'Success'
          }
          var dataCache = { epg: dataSendCache, error }
          await fillBlankEpg(dataCache)
          return res.send(dataCache)
      }
    }
  } else {
    // res.status(400).json('Not provided all required params')
    let error = {
      code: 1,
      desc: 'Not provided all required params'
    }
    data = { epg: [], error }
    return res.send(data)
  }
})

router.get('/tv/event/:key', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (typeof req.params.key !== 'undefined' && typeof req.body.time !== 'undefined') {
    const tstart = req.query.time.substring(0, req.query.time.indexOf(','))
    const tend = req.query.time.substring(req.query.time.indexOf(',') + 1, req.query.time.size)
    const key = req.params.key

    const epgChannels = []
    const epg = []
    const err = {
      code: 200,
      desc: 'OK'
    }

    var allKeys = myCache.keys()
    if (Array.isArray(allKeys)) {
      allKeys.forEach((element) => {
        epgChannels.push(element)
      })
    } else {
      epgChannels.push(allKeys[0])
    }

    const channels = []

    if (Array.isArray(epgChannels)) {
      epgChannels.forEach((element) => {
        const events = myCache.get(element)
        const dataSend = []

        events.forEach((el) => {
          if (((el.fin <= tend && el.fin >= tstart) || (el.str >= tstart && el.str <= tend)) && el.tit.includes(key)) { // fin=finish,str=start
            dataSend.push(el)
            el.tit.match('^' + key + '|' + key + '$|.' + key + '.')
          }
        })
        if (dataSend.length > 0) {
          channels.push({ epgID: element, events: dataSend })
        }
      })
    } else {
      const events = myCache.get(epgChannels[0])
      const dataSend = []

      if (typeof events === 'undefined') {
        return res.send({ error: 'EMPTY CHANNEL' })
      }

      events.forEach((element) => {
        if (((element.fin <= tend && element.fin >= tstart) || (element.str >= tstart && element.str <= tend)) && element.tit.contains(key)) {
          dataSend.push(element)
        }
      })
      channels.push({ epgID: req.query.epgID, events: dataSend })
    }
    epg.push({ start: tstart, end: tend, channels: channels })

    return res.send({ epg, error: err })
  }
})

router.get('/tv/event/:id', (req, res) => { // not in use
  const pom = req.params.id
  sqlAPI = 'SELECT * FROM channel_event WHERE id = ' + pom
  db.connection.query(sqlAPI, (error, results, fields) => {
    if (error) {
      throw error
    }
    const epg = {
      start: req.query.tstart,
      end: req.query.tend,
      channels: {
        epgID: req.query.channel_name,
        events: results
      }
    }
    const err = {
      code: '200',
      desc: 'OK'
    }
    return res.send({ epg, error: err })
  })
})

router.get('/tv/event/:id/image', (req, res) => { // not in use
  const pom = req.params.id
  sqlAPI = 'SELECT image FROM channel_event WHERE id = ' + pom
  db.connection.query(sqlAPI, (error, results, fields) => {
    if (error) {
      throw error
    }
    if (typeof results[0] === 'undefined' || results[0].image === 'null') {
      return res.send({ error: 'IMAGE NOT FOUND' })
    } else {
      return res.sendfile(results[0].image)
    }
  })
})

module.exports = {
  router,
  redisClient
}
