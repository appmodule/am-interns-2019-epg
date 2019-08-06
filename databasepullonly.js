var mysql = require('mysql');
var NodeCache = require('node-cache');
var Database = require('./databaseclass.js');

console.log("Loading from database");

var {db_host, db_user, db_password, db_name,image_folder} = require('./config.js');

var db = new Database({
    host: db_host,
    user: db_user,
    password: db_password,
    database: db_name
});

var myCache = new NodeCache({stdTTL: 60*60*24});

sql = "SELECT * FROM channel"
db.query(sql)
.then(rows=>{
    rows.forEach(function(channel){
        sql = "SELECT channel_display, event_name AS tit, subtitle AS subtit, timestamp_start AS str, start AS timeStr, end AS timeEnd, timestamp_end AS fin, id, icon AS URL, description AS `desc`, episode_number AS episodeNumber FROM channel_event WHERE channel_display ='" + channel.display_name + "';";
        db.query(sql)
        .then(rows=>{
            rows.forEach(element => {
            element.lng = element.fin - element.str
            });
            myCache.set(channel.display_name, rows);
        })        
    });
})

module.exports = {myCache,db};