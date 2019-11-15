var express = require('express')
var router = express.Router()
var myCache
var mysql = require('mysql')
var db
var redis = require('redis')

var redisClient = redis.createClient({ host: 'localhost', port: 6379 })
redisClient.on('ready', function () {
  console.log('Redis is ready')
})

redisClient.on('error', function () {
  console.log('Error in Redis')
})

// ////////////////////////////REST API///////////////////////////////
var sqlAPI
router.get('/category', (req, res) => { // NOT IN USE
  sqlAPI = 'SELECT category_type FROM category'
  db.connection.query(sqlAPI, (error, results, fields) => {
    if (error) {
      throw error
    }
    return res.send({ error: false, data: results, message: 'categories' })
  })
})
var database = require('../database.js')
router.post('/tv/parse', (req, res) => {
  // var databasepullonly = require('../database.js')
  // db = databasepullonly.db
  db = database.main()
})

router.post('/tv/event', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  var databasepullonly = require('../databasepullonly.js')
  db = databasepullonly.db

  if (typeof req.body.time !== 'undefined' || typeof req.body.epgID !== 'undefined') {
    // time is given in the 'startTime,endtime' format so we need to divide it
    var time = req.body.time
    const timestamps = time.split(';')
    const tstarts = []
    const tends = []

    for (var timestamp of timestamps) {
      const startEnd = timestamp.split(',')
      tstarts.push(startEnd[0])
      tends.push(startEnd[1])
    }

    // we also get a number of channels whose events we need to extract and they are in the format Channel1;Channel2;Channel3...
    let epgChannels = req.body.epgID
    epgChannels = epgChannels.split(';')
    while (epgChannels.indexOf('') > 0) {
      epgChannels.splice(epgChannels.indexOf(''), 1)
    }

    // const epg = []
    // const err = {
    //   code: 200,
    //   desc: 'OK'
    // }

    // const channels = []

    if (Array.isArray(epgChannels)) {
      var key = epgChannels + time
      let events = ''

      redisClient.get(key, async function (err, reply) {
        if (err) {
          console.log(err)
        } else if (reply === null) {
          console.log('Not in cache')
          for (var j = 0; j < tstarts.length; j++) {
            for (var channel of epgChannels) {
              const sql = `SELECT channel_display, event_name AS tit, subtitle AS subtit, lang AS lng, timestamp_start AS str, start AS timeStr, end AS timeEnd, timestamp_end AS fin, id, icon AS URL, description AS descr, episode_number AS episodeNumber FROM channel_event WHERE channel_display = ${mysql.escape(channel)} AND timestamp_end BETWEEN ${tstarts[j]} AND ${tends[j]} AND timestamp_start BETWEEN ${tstarts[j]} AND ${tends[j]}`
              var rows = await db.query(sql)
              for (var r of rows) {
                events += `${r.tit}@${r.subtit}@${r.lng}@${r.str}@${r.timeStr}@${r.timeEnd}@${r.fin}@${r.id}@${r.URL}@${r.descr}@${r.episodeNumber};`
              }
              events += '#'
            }
            events += '*'
          }
          redisClient.set(key, events)
          var ttl = 60 * 60 * 6 // 6 hours
          redisClient.expire(key, ttl) // key expires in 6 hours
          console.log('In cache now')

          reply = events.slice(0, -1)

          var replies = reply.split('*')
          var dataSend = []
          for (var a = 0; a < replies.length; a++) {
            var reply3 = replies[a].slice(0, -1)

            var replies3 = reply3.split('#')

            var channelData = []
            for (var l = 0; l < replies3.length; l++) {
              if (replies3[l] === undefined || replies3[l] === null || replies3[l] === '') {
                continue
              } else {
                var reply1 = replies3[l].slice(0, -1)

                var replies1 = reply1.split(';')

                var eventData = []
                for (var p = 0; p < replies1.length; p++) {
                  var replies2 = replies1[p].split('@')

                  eventData.push({ tit: replies2[0], subtit: replies2[1], lng: replies2[2], str: parseInt(replies2[3]), timeStr: replies2[4], timeEnd: replies2[5], fin: parseInt(replies2[6]), id: replies2[7], URL: replies2[8], desc: replies2[9], episodeNumber: parseInt(replies2[10]) })
                }
                channelData.push({ epgID: epgChannels[l], events: eventData })
              }
            }
            dataSend.push({ start: parseInt(tstarts[a]), end: parseInt(tends[a]), channels: channelData })
          }

          return res.send({ epg: dataSend, error: err })
        } else {
          console.log('In cache')

          reply = reply.slice(0, -1)

          replies = reply.split('*')
          dataSend = []
          for (a = 0; a < replies.length; a++) {
            reply3 = replies[a].slice(0, -1)

            replies3 = reply3.split('#')

            channelData = []
            for (l = 0; l < replies3.length; l++) {
              if (replies3[l] === undefined || replies3[l] === null || replies3[l] === '') {
                continue
              } else {
                reply1 = replies3[l].slice(0, -1)

                replies1 = reply1.split(';')

                eventData = []
                for (p = 0; p < replies1.length; p++) {
                  replies2 = replies1[p].split('@')

                  eventData.push({ tit: replies2[0], subtit: replies2[1], lng: replies2[2], str: parseInt(replies2[3]), timeStr: replies2[4], timeEnd: replies2[5], fin: parseInt(replies2[6]), id: replies2[7], URL: replies2[8], desc: replies2[9], episodeNumber: parseInt(replies2[10]) })
                }
                channelData.push({ epgID: epgChannels[l], events: eventData })
              }
            }
            dataSend.push({ start: parseInt(tstarts[a]), end: parseInt(tends[a]), channels: channelData })
          }

          return res.send({ epg: dataSend, error: err })
          // redisClient.flushdb() // flush keys
          // console.log('Cache has been flushed')
        }
      })
    }
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

module.exports = router
