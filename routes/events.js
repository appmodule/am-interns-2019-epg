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

if (process.argv.includes('parse')) {
  var databaseinsert = require('../database.js')
  myCache = databaseinsert.myCache
  db = databaseinsert.db
} else {
  var databasepullonly = require('../databasepullonly.js')
  myCache = databasepullonly.myCache
  db = databasepullonly.db
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

router.post('/tv/event', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
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

    // for (var i = 0; i < tstarts.length; i++) {
    //   console.log(tstarts[i] + ' - ' + tends[i])
    // }
    // const tstart = parseInt(req.body.time.substring(0, req.body.time.indexOf(',')))
    // const tend = parseInt(req.body.time.substring(req.body.time.indexOf(',') + 1, req.body.time.size))

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
          for (var channel of epgChannels) {
            const sql = 'SELECT channel_display, event_name AS tit, subtitle AS subtit, timestamp_start AS str, start AS timeStr, end AS timeEnd, timestamp_end AS fin, id, icon AS URL, description AS `desc`, episode_number AS episodeNumber FROM channel_event WHERE channel_display =' + mysql.escape(channel)
            var rows = await db.query(sql)
            for (var r of rows) {
              for (var j = 0; j < tstarts.length; j++) {
                if ((r.fin <= tends[j] && r.fin >= tstarts[j]) || (r.str <= tends[j] && r.str >= tstarts[j])) {
                  // events.push(r)
                  events += r.str + ',' + r.fin + ',' + r.channel_display + ';'
                  // redisClient.lpush(key, value)
                }
              }
            }
          }
          redisClient.set(key, events)
          var ttl = 60 * 60 * 6 // 6 hours
          redisClient.expire(key, ttl) // key expires in 6 hours
        } else {
          console.log('In cache')
          console.log(reply)
          reply = reply.substring(0, reply.length, -1)
          var replies = reply.split(';')
          var channelNames = []
          var starts = []
          var ends = []
          for (var l = 0; l < replies.length; l++) {
            var reply1 = replies[l].split(',')
            starts[l] = reply1[0]
            ends[l] = reply1[1]
            channelNames[l] = reply1[2]
          }
          // redisClient.flushdb() // flush keys
          // console.log(starts)
          // console.log(ends)
          // console.log(channelNames)
        }
      })

      // epgChannels.forEach((element) => {
      //   const events = myCache.get(element) // get events for this channel from the cache
      //   if (events === undefined) {
      //     return
      //   }

      // const dataSend = []

      //   events.forEach((el) => {
      //     // filtering events for the required timeperiod
      //     if ((el.fin <= tend && el.fin >= tstart) || (el.str >= tstart && el.str <= tend)) { // fin=finish,str=start
      //       dataSend.push(el)
      //     }
      //   })

      //   channels.push({ epgID: element, events: dataSend })
      // })
    } // else {
    //   const events = myCache.get(req.body.epgID)
    //   const dataSend = []

    //   if (typeof events === 'undefined') {
    //     return res.send({ error: 'MISSING ID' })
    //   }

    //   events.forEach((element) => {
    //     if ((element.fin <= tend && element.fin >= tstart) || (element.str >= tstart && element.str <= tend)) {
    //       dataSend.push(element)
    //     }
    //   })
    //   channels.push({ epgID: req.body.epgID, events: dataSend })
    // }
    // epg.push({ start: tstart, end: tend, channels: channels })

    // return res.send({ epg, error: err })
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
