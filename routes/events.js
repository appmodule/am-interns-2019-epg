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

async function fillBlankEpg (epgArray) {
  // var epgArray = JSON.parse(data)
  var db = require('../database.js').db
  for (var a = 0; a < epgArray.epg.length; a++) {
    var chnl = epgArray.epg[a].channels
    for (var i = 0; i < chnl.length; i++) {
      var event = chnl[i].events
      if (event.length === 0) {
        console.log('No EPG-s for test')
      } else {
        for (var j = 0; j < event.length; j++) {
          var z = j + 1
          if (z > event.length - 1) {
            console.log('Test is finished for EPG: ' + chnl[i].epgID)
          } else {
            var startTime = event[j + 1].str
            var endTime = event[j].fin
            var min = 1800000
            if ((endTime - startTime) > min) {
              console.log('No EPG: ' + chnl[i].epgID + ', Id of event: ' + event[j].id)
              var sql = 'INSERT INTO channel_event(start, end, timezone, timestamp_start, timestamp_end, channel_display, event_name, lang, description, rating, star_rating, icon, episode_number, subtitle, date, country, presenter, actor, director, image)' +

                'VALUE ("", "", "", ' + endTime + ',' + startTime + ', "No EPG", "Unknown", "", "", "", "", "", "", "", "", "", "", "", "", "");'

              await db.query(sql)
            }
          }
        }
      }
    }
  }
}
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

router.post('/tv/event', async (req, res) => {
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
                events += `${r.tit}~${r.subtit}~${r.lng}~${r.str}~${r.timeStr}~${r.timeEnd}~${r.fin}~${r.id}~${r.URL}~${r.descr}~${r.episodeNumber}{`
              }
              events += '^'
            }
            events += '}'
          }
          redisClient.set(key, events)
          var ttl = 60 * 60 * 6 // 6 hours
          redisClient.expire(key, ttl) // key expires in 6 hours
          console.log('In cache now')

          reply = events.slice(0, -1)

          var replies = reply.split('}')
          var dataSend = []

          var a = 0
          for (var rep of replies) {
            var reply3 = rep.slice(0, -1)

            var replies3 = reply3.split('^')

            var channelData = []
            var l = 0
            for (var rep3 of replies3) {
              if (rep3 === undefined || rep3 === null || rep3 === '') {
                continue
              } else {
                var reply1 = rep3.slice(0, -1)

                var replies1 = reply1.split('{')

                var eventData = []
                for (var rep1 of replies1) {
                  var replies2 = rep1.split('~')

                  eventData.push({ tit: replies2[0], subtit: replies2[1], lng: replies2[2], str: parseInt(replies2[3]), timeStr: replies2[4], timeEnd: replies2[5], fin: parseInt(replies2[6]), id: replies2[7], URL: replies2[8], desc: replies2[9], episodeNumber: parseInt(replies2[10]) })
                }
                channelData.push({ epgID: epgChannels[l], events: eventData })
              }
              l++
            }
            dataSend.push({ start: parseInt(tstarts[a]), end: parseInt(tends[a]), channels: channelData })
            a++
          }
          var pom = { epg: dataSend, error: err }
          await fillBlankEpg(pom)
          return res.send(pom)
        } else {
          console.log('In cache')

          reply = reply.slice(0, -1)
          replies = []

          replies = reply.split('}')

          dataSend = []
          a = 0
          for (rep of replies) {
            reply3 = rep.slice(0, -1)

            replies3 = reply3.split('^')

            channelData = []
            l = 0
            for (rep3 of replies3) {
              if (rep3 === undefined || rep3 === null || rep3 === '') {
                continue
              } else {
                reply1 = rep3.slice(0, -1)

                replies1 = reply1.split('{')

                eventData = []
                for (rep1 of replies) {
                  replies2 = rep1.split('~')

                  eventData.push({ tit: replies2[0], subtit: replies2[1], lng: replies2[2], str: parseInt(replies2[3]), timeStr: replies2[4], timeEnd: replies2[5], fin: parseInt(replies2[6]), id: replies2[7], URL: replies2[8], desc: replies2[9], episodeNumber: parseInt(replies2[10]) })
                }
                channelData.push({ epgID: epgChannels[l], events: eventData })
              }
              l++
            }

            dataSend.push({ start: parseInt(tstarts[a]), end: parseInt(tends[a]), channels: channelData })
            a++
          }

          pom = { epg: dataSend, error: err }
          await fillBlankEpg(pom)
          return res.send(pom)
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
