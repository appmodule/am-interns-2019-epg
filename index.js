var fs = require('fs')
var HashMap = require('hashmap')
var express = require('express')
var bodyParser = require('body-parser')
var downloader = require('image-downloader')
var NodeCache = require('node-cache')

var myCache
var db

if (process.argv.includes('parse')) {
  var databaseinsert = require('./database.js')
  myCache = databaseinsert.myCache
  db = databaseinsert.db
} else {
  var databasepullonly = require('./databasepullonly.js')
  myCache = databasepullonly.myCache
  db = databasepullonly.db
}

var app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }));

// ////////////////////////////REST API///////////////////////////////
var sqlAPI
app.get('/category', (req, res) => { // NOT IN USE
  sqlAPI = 'SELECT category_type FROM category'
  db.connection.query(sqlAPI, (error, results, fields) => {
    if (error) {
      throw error
    }
    return res.send({ error: false, data: results, message: 'categories' })
  })
})

app.post('/tv/event', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (typeof req.body.time !== 'undefined' || typeof req.body.epgID !== 'undefined') {
    // time is given in the 'startTime,endtime' format so we need to divide it
    const tstart = parseInt(req.body.time.substring(0, req.body.time.indexOf(',')))
    const tend = parseInt(req.body.time.substring(req.body.time.indexOf(',') + 1, req.body.time.size))

    // we also get a number of channels whose events we need to extract and they are in the format Channel1;Channel2;Channel3...
    let epgChannels = req.body.epgID
    epgChannels = epgChannels.split(';')
    while (epgChannels.indexOf('') > 0) {
      epgChannels.splice(epgChannels.indexOf(''), 1)
    }

    const epg = []
    const err = {
      code: 200,
      desc: 'OK'
    }

    const channels = []

    if (Array.isArray(epgChannels)) {
      epgChannels.forEach((element) => {
        const events = myCache.get(element) // get events for this channel from the cache
        if (events === undefined) {
          return
        }
        const dataSend = []

        events.forEach((el) => {
          // filtering events for the required timeperiod
          if ((el.fin <= tend && el.fin >= tstart) || (el.str >= tstart && el.str <= tend)) { // fin=finish,str=start
            dataSend.push(el)
          }
        })

        channels.push({ epgID: element, events: dataSend })
      })
    } else {
      const events = myCache.get(req.body.epgID)
      const dataSend = []

      if (typeof events === 'undefined') {
        return res.send({ error: 'MISSING ID' })
      }

      events.forEach((element) => {
        if ((element.fin <= tend && element.fin >= tstart) || (element.str >= tstart && element.str <= tend)) {
          dataSend.push(element)
        }
      })
      channels.push({ epgID: req.body.epgID, events: dataSend })
    }
    epg.push({ start: tstart, end: tend, channels: channels })

    return res.send({ epg, error: err })
  }
})

app.get('/tv/event/:key', (req, res) => {
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

app.get('/tv/event/:id', (req, res) => { // not in use
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

app.get('/tv/event/:id/image', (req, res) => { // not in use
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

app.listen(3000, () => {
  console.log('Node app is running on port 3000')
})
