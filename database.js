var mysql = require('mysql')
var NodeCache = require('node-cache')
var HashMap = require('hashmap')
var downloader = require('image-downloader')
var parsingxml = require('./parsingxml')
var Database = require('./databaseclass.js')
var { dbHost, dbUser, dbPassword, dbName, imageFolder } = require('./config.js') // image_folder removed

var jsonProgramms = parsingxml.jsonProgramms
var jsonChannels = parsingxml.jsonChannels
/* This method is used string manipulation, it is needed for entering data into the database without any errors */
String.replaceAll = function (search, replacement) {
  var target = this
  return target.split(search).join(replacement)
}

var db = new Database({
  host: dbHost,
  user: dbUser,
  password: dbPassword,
  database: dbName
})

var myCache = new NodeCache({ stdTTL: 60 * 60 * 24 })
var map = new HashMap() // cat
var map2 = new HashMap() // channel
var map3 = new HashMap() // event
var map4 = new HashMap() // event_category reserved for future purposes

/* This section fetches existing data and inserts new data into the base */
db.connection.connect((connectionError) => {
  if (connectionError) {
    throw connectionError
  }
  let sql = 'SELECT category_type AS category FROM category;'

  let l
  db.query(sql) // category insertion
    .then(rows => {
      rows.forEach(el => map.set(el.category.replace("'", "''"), el.category))
      jsonProgramms.forEach((element) => {
        if (typeof element.category !== 'undefined') {
          if (Array.isArray(element.category)) { // in json when there are multiple categories it is given as an array
            // when it is just one category it is not an array
            element.category.forEach((element) => {
              element.text = element.text.toString()
              l = element.text.replace(/'/g, "''")
              l = l.replace('(lang=de)', '')
              if (!map.has(l)) {
                map.set(l, l)
                sql = 'INSERT INTO category(category_type) VALUE(' + mysql.escape(l) + ');'
                db.query(sql)
              }
            })
          } else {
            l = element.category.text.replace("'", "''")
            l = l.replace('(lang=de)', '')
            if (!map.has(l)) {
              map.set(l, l)
              sql = 'INSERT INTO category(category_type) VALUE(' + mysql.escape(l) + ');'
              db.query(sql)
            }
          }
        }
      })
    })
    .then(() => { // fetches all channels
      sql = 'SELECT display_name FROM channel'
      return db.query(sql)
    })
    .then(rows => {
      rows.forEach((element) => { // creates a hashmap of (existing) channels(in the database)
        map2.set(element.display_name, element.display_name)
      })
      jsonChannels.forEach((element) => {
        // some channels have icons, some don't. that is why we check whether or not it exists
        if (element.icon === undefined && !map2.has(element['@id'])) {
          sql = 'INSERT INTO channel(display_name, lang) VALUE (' + mysql.escape(element['@id']) + ',' + mysql.escape(element['display-name']['@lang']) + ');'
          db.query(sql)
            .then(() => { map2.set(element['@id']) })
        } else if (element.icon !== undefined && !map2.has(element['@id'])) {
          sql = 'INSERT INTO channel(display_name, lang, icon) VALUE (' + mysql.escape(element['@id']) + ',' + mysql.escape(element['display-name']['@lang']) + ',' + mysql.escape(element.icon['@src']) + ')'
          db.query(sql)
            .then(() => { map2.set(element['@id']) })
        }
      })
    })
    .then(() => { // getting events from the database
      sql = 'SELECT event_name, channel_display, timestamp_start, timestamp_end FROM channel_event;'
      return db.query(sql)
    })
    .then(rows => {
      rows.forEach((element) => { // filling the hashmap for events
        const tCombine = element.timestamp_start + element.timestamp_end
        map3.set(element.event_name + tCombine + element.channel_display, element.event_name + tCombine + element.channel_display)
      })

      var date
      var episodeNumber
      var rating
      var starRating
      var subtitle
      var description
      // var category
      var icon
      // var lang
      var country
      var presenter
      var director
      var actor
      var eventName
      // ///////////////////////////////////////////////////
      // ////////////Variable validation START//////////////
      // ///////////////////////////////////////////////////
      for (let p = 0; p < jsonProgramms.length; p++) {
      // jsonProgramms.forEach((program) => {
        let program = jsonProgramms[p]

        console.log(`Parsing program ${p}/${jsonProgramms.length}`)

        if (program.desc === undefined) {
          description = null
        } else {
          description = program.desc.text
          description = description.replace("'", "''")
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
          if (typeof subtitle === 'string') {
            subtitle = subtitle.replace("'", "''")
          }
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
              program.credits.presenter.forEach(function (z) {
                presenter = presenter + pom + z
                pom = '\n'
              })
            } else {
              presenter = program.credits.presenter
            }
            presenter = presenter.replaceAll("'", "''")
          }

          if (program.credits.director === undefined) {
            director = null
          } else {
            if (Array.isArray(program.credits.director)) {
              director = ''
              let pom = ''
              program.credits.director.forEach(function (z) {
                director = director + pom + z
                pom = '\n'
              })
            } else {
              director = program.credits.director
            }
            director = director.replace("'", "''")
          }

          if (program.credits.actor === undefined) {
            actor = null
          } else {
            if (Array.isArray(program.credits.actor)) {
              actor = ''
              let pom = ''
              program.credits.actor.forEach((z) => {
                actor = actor + pom + z
                pom = '\n'
              })
            } else {
              actor = program.credits.actor
            }
            actor = actor.replace("'", "''")
          }
        }

        program.title.text = program.title.text.toString()
        eventName = program.title.text.replace("'", "''")
        eventName = eventName.replace('(lang=de)', '')

        var startDate = program['@start']
        var stopDate = program['@stop']
        var startTimestamp = program.start_timestamp
        var stopTimestamp = program.stop_timestamp
        var tz = program.timezone
        // ///////////////////////////////////////////////////
        // ////////////Variable validation END////////////////
        // ///////////////////////////////////////////////////
        const tSum = startTimestamp + stopTimestamp

        let eventNameHash = program.title.text

        if (typeof eventNameHash === 'string') {
          eventNameHash = eventNameHash.replace('(lang=de)', '')
          eventNameHash = eventNameHash.replace('\\u', 'u')
        }

        if (map3.has(eventNameHash + tSum + program['@channel'])) {
          return // continue
        }

        var img = null

        /*
        position to ./public/images
        mkdir -p {{0..9},{a..z},{A..Z}}/{{0..9},{a..z},{A..Z}} and enter the command in the terminal
        */
        if (icon != null) {
          var opt = {
            url: icon,
            dest: imageFolder // determines the destination by the first 2 characters to get a 2 level folder tree for search optimisation
          }
          img = opt.url.lastIndexOf('/')
          img = opt.url.substring(img, opt.url.size)
          opt.dest = opt.dest + '/' + img[1] + '/' + img[2]
          img = opt.dest + img
          downloadIMG(opt)
        }

        sql = 'INSERT INTO channel_event(start, end, timezone, timestamp_start, timestamp_end, channel_display, event_name, lang, description, rating, star_rating, icon, episode_number, subtitle, date, country, presenter, actor, director, image)' +

           'VALUE (' + mysql.escape(startDate) + ',' + mysql.escape(stopDate) + ',' + mysql.escape(tz) + ',' + mysql.escape(startTimestamp) + ',' +
           mysql.escape(stopTimestamp) + ',' + mysql.escape(program['@channel']) + ',' +
           mysql.escape(eventName || 'Unknown') + ',' + mysql.escape(program.title['@lang']) + ',' +
           mysql.escape(description) + ',' + mysql.escape(rating) + ',' + mysql.escape(starRating) + ',' +
           mysql.escape(icon) + ',' + mysql.escape(episodeNumber) + ',' + mysql.escape(subtitle) + ',' + mysql.escape(date) + ',' +
           mysql.escape(country) + ',' + mysql.escape(presenter) + ',' + mysql.escape(actor) + ',' +
           mysql.escape(director) + ',' + mysql.escape(img) + ');'

        // + "VALUE ('" + mysql.escape(startDate) + "','" + mysql.escape(stopDate) + "','" + tz + "'," + mysql.escape(startTimestamp) + ","
        // + mysql.escape(stopTimestamp) + ",'" + mysql.escape(element["@channel"]) + "','"
        // + mysql.escape(eventName) + "','" + mysql.escape(element["title"]["@lang"]) + "','"
        // + mysql.escape(description) + "','" + mysql.escape(rating) + "','" + mysql.escape(starRating) + "','"
        // + mysql.escape(icon) + "','" + mysql.escape(episodeNumber) + "','" + mysql.escape(subtitle) + "','" + mysql.escape(date) + "','" 
        // + mysql.escape(country) + "','" + mysql.escape(presenter) + "','" + mysql.escape(actor) + "','"
        // + mysql.escape(director) + "','" + mysql.escape(img) + "');";

        // const values = [ startDate, stopDate, tz, startTimestamp, stopTimestamp, element["@channel"],
        //   eventName, element["title"]["@lang"], 
        //   description, rating, starRating, icon, episodeNumber, subtitle, date, country,
        //   presenter, actor, director, img
        // ]
        // map3.set(eventNameHash + tSum + element["@channel"], eventName + tSum + element["@channel"]);
        // console.log(sql)
        db.query(sql)
          .then(() => {
            map3.set(eventNameHash + tSum + program['@channel'], eventName + tSum + program['@channel'])
          })
          .catch(e => {
            console.log(e)
          })
      }
    })
    .then(() => { // this can be used to help filter shows by category (this wasn't in the specification)
      var eventName
      var eventNameHash

      sql = 'SELECT channel_event_name AS event, category_name AS category FROM event_category;'
      db.query(sql)
        .then(rows => {
          rows.forEach((element) => {
            map4.set(element.event + element.category, element.event + element.category)
          })
          let l
          let tmp
          jsonProgramms.forEach((element) => {
            if (typeof element.category === 'undefined') {
              return
            }
            if (element.title && element.title.text) {
              // if (typeof element["title"]["text"] !== 'string') {
              //   eventName = element["title"]["text"]
              // } else {
              //   eventName = element["title"]["text"].replace("(lang=de)","");
              // }
              eventName = element.title.text.toString()
              eventName = eventName.replace('(lang=de)', '')
            } else {
              eventName = 'No title'
            }
            eventNameHash = eventName.replace('\\u', 'u')
            eventName = eventName.replace("'", "''")

            if (Array.isArray(element.category)) {
              element.category.forEach((el) => {
                tmp = l = el.text.replace('(lang=de)', '')
                if (!map4.has(eventNameHash + l)) {
                  l = l.replace("'", "''")
                  sql = 'INSERT INTO event_category(channel_event_name, category_name) VALUE (' + mysql.escape(eventName) + ', ' + mysql.escape(l) + ');'
                  map4.set(eventNameHash + tmp, eventNameHash + tmp)
                  db.query(sql)
                }
              })
            } else {
              tmp = l = element.category.text.replace('(lang=de)', '')
              if (!map4.has(eventNameHash + l)) {
                l = l.replace("'", "''")
                sql = 'INSERT INTO event_category(channel_event_name, category_name) VALUE (' + mysql.escape(eventName) + ', ' + mysql.escape(l) + ');'
                map4.set(eventNameHash + tmp, eventNameHash + tmp)
                db.query(sql)
              }
            }
          })
        })
    })
    .then(() => {
      sql = 'SELECT * FROM channel'
      db.query(sql)
        .then(rows => {
          rows.forEach((channel) => {
            sql = 'SELECT channel_display,event_name AS tit, subtitle AS subtit, timestamp_start AS str, start AS timeStr, end AS timeEnd, timestamp_end AS fin, id, icon AS URL,  description AS `desc`,episode_number AS episodeNumber FROM channel_event WHERE channel_display =' + mysql.escape(channel.display_name) + ';'
            // sql = "SELECT * FROM channel_event WHERE channel_display ='" + channel.display_name + "';";
            db.query(sql)
              .then(rows => {
                rows.forEach(element => {
                  element.lng = element.fin - element.str
                })
                myCache.set(channel.display_name, rows)
              })
          })
        })
    })
})

async function downloadIMG (option) {
  let pom
  try {
    const { fn, img } = await downloader.image(option)
    console.log('Saved image to:', fn) // => /path/to/dest/image.jpg
    // Update database
  } catch (e) {
    console.error(e)
    // icon = null;
  }
  // return pom.fn;
}
module.exports = { myCache, db }
