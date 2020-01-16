var mysql = require('mysql')
var HashMap = require('hashmap')
var downloader = require('image-downloader')
var parsingxml = require('./parsingxml')
var Database = require('./databaseclass.js')
var dotenv = require('dotenv')
const fs = require('fs')
dotenv.config()
var { dbHost, dbUser, dbPassword, dbName, imageFolder } = require('./config.js') // image_folder removed

// var jsonProgramms = parsingxml.jsonProgramms
// var jsonChannels = parsingxml.jsonChannels
/* This method is used string manipulation, it is needed for entering data into the database without any errors */

var db = new Database({
  host: dbHost,
  user: dbUser,
  password: dbPassword,
  database: dbName
})

// var myCache = new NodeCache({ stdTTL: 60 * 60 * 24 })
var mapCategory = new HashMap() // cat
var mapChannel = new HashMap() // channel
var mapEvent = new HashMap() // event
var mapEventCategory = new HashMap() // event_category reserved for future purposes

var arrayPictures = []

async function insertChannels (jsonObj) {
  var jsonChannels = parsingxml.getChannels(jsonObj)
  var sql = 'SELECT display_name FROM channel'
  var rows = await db.query(sql)
  for (var element of rows) {
    mapChannel.set(element.display_name, element.display_name)
  }
  for (element of jsonChannels) {
    if (element.icon === undefined && !mapChannel.has(element['display-name'].text)) {
      sql = 'INSERT INTO channel(display_name, lang) VALUE (' + mysql.escape(element['display-name'].text) + ',' + mysql.escape(element['display-name']['@lang']) + ');'
      await db.query(sql)
      try { mapChannel.set(element['display-name'].text, element['display-name'].text) } catch (e) {
        console.log(e)
      }
    } else if (element.icon !== undefined && !mapChannel.has(element['display-name'].text)) {
      sql = 'INSERT INTO channel(display_name, lang, icon) VALUE (' + mysql.escape(element['display-name'].text) + ',' + mysql.escape(element['display-name']['@lang']) + ',' + mysql.escape(element.icon['@src']) + ');'
      await db.query(sql)
      try { mapChannel.set(element['display-name'].text, element['display-name'].text) } catch (e) {
        console.log(e)
      }
    }
    // return rows
  }
}

async function insertCategory (jsonProgramms) {
  let sql = 'SELECT category_type AS category FROM category;'

  let l
  for (var element of jsonProgramms) {
    if (typeof element.category !== 'undefined') {
      if (Array.isArray(element.category)) { // in json when there are multiple categories it is given as an array
        // when it is just one category it is not an array
        for (element of element.category) {
          element.text = element.text.toString()
          l = element.text.replace('(lang=de)', '')
          if (!mapCategory.has(l)) {
            mapCategory.set(l, l)
            sql = 'SELECT COUNT(*) as cc FROM category WHERE category_type = ' + mysql.escape(l) + ';'
            var ql = await db.query(sql)
            if (ql[0].cc === 0) {
              sql = 'INSERT INTO category(category_type) VALUE(' + mysql.escape(l) + ');'
              await db.query(sql)
            } else {
              continue
            }
          }
        }
      } else {
        l = element.category.text.toString()
        l = l.replace('(lang=de)', '')
        if (!mapCategory.has(l)) {
          mapCategory.set(l, l)
          sql = 'SELECT COUNT(*) as cc FROM category WHERE category_type = ' + mysql.escape(l) + ';'
          ql = await db.query(sql)
          if (ql[0].cc === 0) {
            sql = 'INSERT INTO category(category_type) VALUE(' + mysql.escape(l) + ');'
            await db.query(sql)
          } else {
            continue
          }
        }
      }
    }
  }
}

async function getEvents () {
  var sql = 'SELECT event_name, channel_display, timestamp_start, timestamp_end FROM channel_event;'
  var rows = await db.query(sql)

  for (var element of rows) {
    const tCombine = element.timestamp_start + element.timestamp_end
    mapEvent.set(element.event_name + tCombine + element.channel_display, element.event_name + tCombine + element.channel_display)
  }
}

async function deleteEvents (eventsXml) {
  var filePath = eventsXml
  var splitFileName = filePath.split('/')
  var fileName = splitFileName[2]
  var splitFileDate = fileName.split('_')
  var fileDateXml = splitFileDate[2]
  var fileDate = fileDateXml.split('.')[0]
  fileDate += ' 00:00:00'
  var dt = Date.parse(fileDate)
  var sql = 'DELETE FROM channel_event WHERE timestamp_start >= ' + dt + ';'
  await db.query(sql)
}

async function downloadComplete () {
  console.log('Finished downloading images.')
}

async function insertEvents (jsonProgramms) {
  var date
  var episodeNumber
  var rating
  var starRating
  var subtitle
  var description
  var icon
  var country
  var presenter
  var director
  var actor
  var eventName
  // ///////////////////////////////////////////////////
  // ////////////Variable validation START//////////////
  // ///////////////////////////////////////////////////
  var p = 1
  for (var program of jsonProgramms) {
    try {
      console.log(`Parsing program ${p}/${jsonProgramms.length}`)
      p++
      if (program.desc === undefined) {
        description = null
      } else {
        description = program.desc.text
      }

      if (program.icon === undefined) {
        icon = null
      } else {
        icon = program.icon['@src']
      }

      if (program.date === undefined) {
        date = null
      } else {
        date = program.date
      }

      if (program.country === undefined) {
        country = null
      } else {
        country = program.country.text
      }

      if (program['episode-num'] === undefined) {
        episodeNumber = null
      } else {
        episodeNumber = program['episode-num'].text
      }

      if (program.rating === undefined) {
        rating = null
      } else {
        rating = program.rating.value
      }

      if (program['sub-title'] === undefined) {
        subtitle = null
      } else {
        subtitle = program['sub-title'].text
      }

      if (program['star-rating'] === undefined) {
        starRating = null
      } else {
        starRating = program['star-rating'].value
      }

      if (program.credits === undefined) {
        presenter = null
        director = null
        actor = null
      } else {
        if (program.credits.presenter === undefined) {
          presenter = null
        } else {
          if (Array.isArray(program.credits.presenter)) {
            presenter = ''
            let pom = ''
            for (var pcp of program.credits.presenter) {
              presenter = presenter + pom + pcp
              pom = '\n'
            }
          } else {
            presenter = program.credits.presenter
          }
        }

        if (program.credits.director === undefined) {
          director = null
        } else {
          if (Array.isArray(program.credits.director)) {
            director = ''
            let pom = ''
            for (var pcd of program.credits.director) {
              director = director + pom + pcd
              pom = '\n'
            }
          } else {
            director = program.credits.director
          }
        }

        if (program.credits.actor === undefined) {
          actor = null
        } else {
          if (Array.isArray(program.credits.actor)) {
            actor = ''
            let pom = ''
            for (var pca of program.credits.actor) {
              actor = actor + pom + pca
              pom = '\n'
            }
          } else {
            actor = program.credits.actor
          }
        }
      }
      var programTitle
      let eventNameHash
      var lang
      if (program.title === undefined) {
        programTitle = null
        eventName = ''
        eventNameHash = ''
        lang = ''
      } else {
        programTitle = program.title.text.toString()
        eventName = program.title.text.replace('(lang=de)', '')
        eventNameHash = program.title.text
        if (program.title['@lang'] === undefined) {
          lang = ''
        } else {
          lang = program.title['@lang']
        }
      }
      // program.title.text = program.title.text.toString()
      // eventName = program.title.text.replace('(lang=de)', '')

      var startDate = program['@start']
      var stopDate = program['@stop']
      var startTimestamp = program.start_timestamp
      var stopTimestamp = program.stop_timestamp
      var tz = program.timezone
      // ///////////////////////////////////////////////////
      // ////////////Variable validation END////////////////
      // ///////////////////////////////////////////////////
      const tSum = startTimestamp + stopTimestamp

      // let eventNameHash = program.title.text

      if (typeof eventNameHash === 'string') {
        eventNameHash = eventNameHash.replace('(lang=de)', '')
        eventNameHash = eventNameHash.replace('\\u', 'u')
      }

      if (mapEvent.has(eventNameHash + tSum + program['@channel'])) {
        return // continue
      }

      var img = null

      if (icon != null) {
        var opt = {
          url: icon,
          dest: imageFolder // determines the destination by the first 2 characters to get a 2 level folder tree for search optimisation
        }
        img = opt.url.lastIndexOf('/')
        img = opt.url.substring(img, opt.url.size)
        opt.dest = opt.dest + '/' + img[1] + '/' + img[2]
        img = opt.dest + img
        arrayPictures.push(opt)
      } else {
        console.log('icon is null')
      }

      var channelName = program['@channel']
      var sql = 'SELECT display_name FROM channel WHERE display_name = ' + mysql.escape(channelName) + ';'
      var res = await db.query(sql)
      var chName = res[0].display_name

      sql = 'SELECT COUNT(*) AS countChannels FROM channel WHERE display_name = ' + mysql.escape(chName) + ';'
      var resCount = await db.query(sql)

      if (resCount[0].countChannels > 0) {
        sql = 'INSERT INTO channel_event(start, end, timezone, timestamp_start, timestamp_end, channel_display, event_name, lang, description, rating, star_rating, icon, episode_number, subtitle, date, country, presenter, actor, director, image)' +

          'VALUE (' + mysql.escape(startDate) + ',' + mysql.escape(stopDate) + ',' + mysql.escape(tz) + ',' + mysql.escape(startTimestamp) + ',' +
          mysql.escape(stopTimestamp) + ',' + mysql.escape(chName) + ',' +
          mysql.escape(eventName || 'Unknown') + ',' + mysql.escape(lang) + ',' +
          mysql.escape(description) + ',' + mysql.escape(rating) + ',' + mysql.escape(starRating) + ',' +
          mysql.escape(icon) + ',' + mysql.escape(episodeNumber) + ',' + mysql.escape(subtitle) + ',' + mysql.escape(date) + ',' +
          mysql.escape(country) + ',' + mysql.escape(presenter) + ',' + mysql.escape(actor) + ',' +
          mysql.escape(director) + ',' + mysql.escape(img) + ');'

        await db.query(sql)

        await mapEvent.set(eventNameHash + tSum + program['@channel'], eventName + tSum + program['@channel'])
      }
    } catch (e) {
      console.log(e)
    }
  }
}

async function insertEventCategory (jsonProgramms) {
  var eventName
  var eventNameHash

  var sql = 'SELECT channel_event_name AS event, category_name AS category FROM event_category;'
  var rows = await db.query(sql)
  for (var element of rows) {
    mapEventCategory.set(element.event + element.category, element.event + element.category)
  }
  let l
  let tmp
  for (element of jsonProgramms) {
    if (typeof element.category === 'undefined') {
      continue
    }
    if (element.title && element.title.text) {
      eventName = element.title.text.toString()
      eventName = eventName.replace('(lang=de)', '')
    } else {
      eventName = 'No title'
    }
    eventNameHash = eventName.replace('\\u', 'u')

    if (Array.isArray(element.category)) {
      for (var el of element.category) {
        tmp = l = el.text.replace('(lang=de)', '')
        if (!mapEventCategory.has(eventNameHash + l)) {
          sql = 'SELECT COUNT(*) AS countEvents FROM channel_event WHERE event_name = ' + mysql.escape(eventName) + ';'
          var sqlRes = await db.query(sql)
          if (sqlRes[0].countEvents > 0) {
            sql = 'INSERT INTO event_category(channel_event_name, category_name) VALUE (' + mysql.escape(eventName) + ', ' + mysql.escape(l) + ');'
            mapEventCategory.set(eventNameHash + tmp, eventNameHash + tmp)
            await db.query(sql)
          }
        }
      }
    } else {
      tmp = l = element.category.text
      if (!mapEventCategory.has(eventNameHash + l)) {
        sql = 'SELECT COUNT(*) AS countEvents FROM channel_event WHERE event_name = ' + mysql.escape(eventName) + ';'
        sqlRes = await db.query(sql)
        if (sqlRes[0].countEvents > 0) {
          sql = 'INSERT INTO event_category(channel_event_name, category_name) VALUE (' + mysql.escape(eventName) + ', ' + mysql.escape(l) + ');'
          mapEventCategory.set(eventNameHash + tmp, eventNameHash + tmp)
          await db.query(sql)
        }
      }
    }
  }
}

async function selectChannels () {
  var sql = 'SELECT * FROM channel'
  var rows = await db.query(sql)
  for (var channel of rows) {
    sql = 'SELECT channel_display, event_name AS tit, subtitle AS subtit, timestamp_start AS str, start AS timeStr, end AS timeEnd, timestamp_end AS fin, id, icon AS URL,  description AS `desc`,episode_number AS episodeNumber FROM channel_event WHERE channel_display =' + mysql.escape(channel.display_name) + ';'
    rows = await db.query(sql)
    for (var element of rows) {
      element.lng = element.fin - element.str
    }
  }
}
async function clearMaps () {
  mapCategory.clear()
  mapChannel.clear()
  mapEvent.clear()
  mapEventCategory.clear()
}

async function main (eventsXml) {
  try {
    await deleteEvents(eventsXml)
  } catch (e) {
    console.log(e)
  }
  console.log('Parsing started ...')
  var jsonObj = parsingxml.parsing(eventsXml)
  var jsonProgramms = await parsingxml.getProgramms(jsonObj)
  try {
    await insertCategory(jsonProgramms)
  } catch (e) {
    console.log(e)
  }

  try {
    await insertChannels(jsonObj)
  } catch (e) {
    console.log(e)
  }

  try {
    await insertEvents(jsonProgramms)
  } catch (e) {
    console.log(e)
  }

  try {
    await insertEventCategory(jsonProgramms)
  } catch (e) {
    console.log(e)
  }

  try {
    await selectChannels()
  } catch (e) {
    console.log(e)
  }

  try {
    await getEvents()
  } catch (e) {
    console.log(e)
  }
  db.close()

  console.log('Parsing finished')
  try {
    // await rp.post(parseEvents)
    // await downloadPictures()
    await downloadComplete()
    await clearMaps()
  } catch (e) {
    console.log(e)
  }
}
/* This section fetches existing data and inserts new data into the base */
db.connection.connect(async (connectionError) => {
  if (connectionError) {
    throw connectionError
  }
})

async function downloadPictures () {
  if (!fs.existsSync(imageFolder)) {
    fs.mkdirSync(imageFolder)
  }

  // const downladArr = []
  for (var pic of arrayPictures) {
    try {
      var folderNames = pic.dest.split('/')
      var folderNameFirst = imageFolder + '/' + folderNames[2]
      if (!fs.existsSync(folderNameFirst)) {
        fs.mkdirSync(folderNameFirst)
      }
      var folderNameSecond = pic.dest
      if (!fs.existsSync(folderNameSecond)) {
        fs.mkdirSync(folderNameSecond)
      }

      var picName = pic.url.lastIndexOf('/')
      picName = pic.url.substring(picName, pic.url.size)
      var picPath = pic.dest + picName
      if (!fs.existsSync(picPath)) {
        await downloader.image(pic)
      }
    } catch (e) {
      console.log(e)
    }
  }
}

// async function downloadIMG (option) {
//   return downloader.image(option)
//     .then(console.log('saved image'))
//     .catch(e => {
//       var content = e + '\r\n'
//       fs.appendFile('errors.txt', content)
//       console.log('ERROR SAVING IMAGE')
//     })
// }
module.exports = { db, main }
