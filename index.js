var fs = require('fs');
var HashMap = require('hashmap');
var express = require('express');
var bodyParser = require('body-parser');
var downloader = require('image-downloader');
var NodeCache = require('node-cache');

var myCache;
var db;

if (process.argv.includes("parse")){
  var databaseinsert = require('./database.js');
  myCache = databaseinsert.myCache;
  db = databaseinsert.db;
}
else{
  var databasepullonly = require('./databasepullonly.js');
  myCache = databasepullonly.myCache;
  db = databasepullonly.db;
}

var app = express();

//////////////////////////////REST API///////////////////////////////
var sqlAPI;
app.get('/category', function (req, res) {//NOT IN USE
  sqlAPI = "SELECT category_type FROM category";
  db.connection.query(sqlAPI, function (error, results, fields) {
      if (error){
        throw error;
      }
      return res.send({ error: false, data: results, message: 'categories' });
  });
});

app.get('/tv/event', function (req, res) {
  res.setHeader("Access-Control-Allow-Origin","*")
  if (typeof req.query.time != 'undefined' || typeof req.query.epgID != 'undefined'){

    //time is given in the 'startTime,endtime' format so we need to divide it
    let tstart = req.query.time.substring(0, req.query.time.indexOf(","));
    let tend = req.query.time.substring(req.query.time.indexOf(",") + 1, req.query.time.size);

    //we also get a number of channels whose events we need to extract and they are in the format Channel1;Channel2;Channel3...
    let epgChannels = req.query.epgID;
    epgChannels = epgChannels.split(';');
    while(epgChannels.indexOf("") > 0){
      epgChannels.splice(epgChannels.indexOf(""), 1);
    }

    let epg = [];
    let err ={
      code: '200',
      desc: 'OK'  
    }

    let channels = [];

    if (Array.isArray(epgChannels)){
      epgChannels.forEach(function(element){
        let events = myCache.get(element);//get events for this channel from the cache
        if (events == undefined){
          return;
        }
        let dataSend = [];

        events.forEach(function(el){
          //filtering events for the required timeperiod
          if ((el.fin <= tend && el.fin >= tstart) || (el.str >= tstart && el.str <= tend)){ //fin=finish,str=start
            dataSend.push(el);
          }
        });

        channels.push({epgID: element, events: dataSend});
      })
    }
    else{
      let events = myCache.get(req.query.epgID);
      let dataSend = [];

      if (typeof events == 'undefined'){
        return res.send({error: 'MISSING ID'});
      }

      events.forEach(function(element){
        if ((element.fin <= tend && element.fin >= tstart) || (element.str >= tstart && element.str <= tend)){
          dataSend.push(element);
        }
      });
      channels.push({epgID: req.query.epgID, events: dataSend})
    }
    epg.push({start: tstart, end: tend, channels: channels});

    return res.send({ epg, error:err});
  }
})

app.get('/tv/event/:key', function (req, res) {
  res.setHeader("Access-Control-Allow-Origin","*")
  if (typeof req.params.key != 'undefined' && typeof req.query.time != 'undefined'){
    let tstart = req.query.time.substring(0, req.query.time.indexOf(","));
    let tend = req.query.time.substring(req.query.time.indexOf(",") + 1, req.query.time.size);
    let key = req.params.key;

    let epgChannels = [];
    let epg = [];
    let err ={
      code: '200',
      desc: 'OK'  
    }

    var allKeys = myCache.keys();
    if (Array.isArray(allKeys)){
      allKeys.forEach(function(element){
        epgChannels.push(element);
      })
    }
    else{
      epgChannels.push(allKeys[0]);
    }

    let channels = [];

    if (Array.isArray(epgChannels)){
      epgChannels.forEach(function(element){
        let events = myCache.get(element);
        let dataSend = [];

        events.forEach(function(el){
          if (((el.fin <= tend && el.fin >= tstart) || (el.str >= tstart && el.str <= tend)) && el.tit.includes(key)){ //fin=finish,str=start
            dataSend.push(el);
            el.tit.match('^' + key + '|' + key + '$|.' + key + '.');
          }
        });
        if (dataSend.length > 0){
          channels.push({epgID: element, events: dataSend});
        }
      })
    }
    else{
      let events = myCache.get(epgChannels[0]);
      let dataSend = [];

      if (typeof events == 'undefined'){
        return res.send({error: 'EMPTY CHANNEL'});
      }

      events.forEach(function(element){
        if (((element.fin <= tend && element.fin >= tstart) || (element.str >= tstart && element.str <= tend)) && el.tit.contains(key)){
          dataSend.push(element);
        }
      });
      channels.push({epgID: req.query.epgID, events: dataSend})
    }
    epg.push({start: tstart, end: tend, channels: channels});

    return res.send({ epg, error:err});
  }
})


app.get('/tv/event/:id', function (req, res){// not in use
  
  let pom = req.params.id;
  sqlAPI = "SELECT * FROM channel_event WHERE id = " + pom;
  db.connection.query(sqlAPI, function (error, results, fields) {
    if (error){
      throw error;
    }
    let epg={
        start:req.query.tstart,
        end:req.query.tend,
        channels:{
          epgID:req.query.channel_name,
          events:results
        }
      }
      let err={
        code:'200',
        desc:'OK'  
      }
    return res.send({ epg, error:err});
  });
});

app.get('/tv/event/:id/image', function (req, res){// not in use
  let pom = req.params.id;
  sqlAPI = "SELECT image FROM channel_event WHERE id = " + pom;
  db.connection.query(sqlAPI, function (error, results, fields) {
    if (error){
      throw error;
    }
    if (typeof results[0] == "undefined" || results[0].image == 'null'){
      return res.send({error: 'IMAGE NOT FOUND'})
    }
    else{
      return res.sendfile(results[0].image);
    }
  });
});


app.listen(3000, function (){
  console.log('Node app is running on port 3000');
});