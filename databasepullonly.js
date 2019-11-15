var mysql = require('mysql')
// var NodeCache = require('node-cache')
var Database = require('./databaseclass.js')

console.log('Loading from database')

var { dbHost, dbUser, dbPassword, dbName } = require('./config.js') // image_folder removed

var db = new Database({
  host: dbHost,
  user: dbUser,
  password: dbPassword,
  database: dbName
})

// var myCache = new NodeCache({ stdTTL: 60 * 60 * 24 })

let sql = 'SELECT * FROM channel'
db.query(sql)
  .then(rows => {
    rows.forEach((channel) => {
      sql = 'SELECT channel_display, event_name AS tit, subtitle AS subtit, timestamp_start AS str, start AS timeStr, end AS timeEnd, timestamp_end AS fin, id, icon AS URL, description AS `desc`, episode_number AS episodeNumber FROM channel_event WHERE channel_display =' + mysql.escape(channel.display_name)
      db.query(sql)
        .then(rows => {
          rows.forEach(element => {
            element.lng = element.fin - element.str
          })
          // myCache.set(channel.display_name, rows)
        })
    })
  })

module.exports = { db }
