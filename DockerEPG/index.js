var fs = require('fs');
var HashMap = require('hashmap');
var express = require('express');
var bodyParser = require('body-parser');

var NodeCache = require('node-cache');

var databaseinsert = require('./database.js')//require('./databaseinsert');

myCache = databaseinsert.myCache;
db=databaseinsert.db
var app = express();

//REST API
var sqlAPI;
app.get('/category', function (req, res) {
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
    let tstart = req.query.time.substring(0, req.query.time.indexOf(","));
    let tend = req.query.time.substring(req.query.time.indexOf(",") + 1, req.query.time.size);
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
        let programi = myCache.get(element);
        if (programi == undefined){
          return;
        }
        let dataSend = [];

        programi.forEach(function(el){
          if ((el.fin <= tend && el.fin >= tstart) || (el.str >= tstart && el.str <= tend)){
            dataSend.push(el);
          }
        });

        channels.push({epgID: element, events: dataSend});
      })
    }
    else{
      let programi = myCache.get(req.query.epgID);
      let dataSend = [];

      if (typeof programi == 'undefined'){
        return res.send({error: 'MISSING ID'});
      }

      programi.forEach(function(element){
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

// app.get('/tv/event', function (req, res) {
//   if (typeof req.query.time != 'undefined'  && typeof req.query.epgID != 'undefined'){
    
//     let time=req.query.time;
//     let tstart=time.substr(0,time.indexOf(','))
//     let tend=time.substr(time.indexOf(',')+1,time.size)

//     let programi = myCache.get(req.query.epgID);
//     let dataSend = [];

//     if (typeof programi == 'undefined'){
//       return res.send({error: 'MISSING ID'});
//     }

//     programi.forEach(function(element){
//       if ((element.fin <= tend && element.fin >= tstart) || (element.str >= tstart && element.str <= tend)){
//         dataSend.push(element);
//       }
//     });
//     let channels=[{
//       epgID:req.query.epgID,
//       events:dataSend
//     }]
//     let epg=[{
//       start:req.query.tstart,
//       end:req.query.tend,
//       channels:channels
//     }]
//     let err={
//       code:'200',
//       desc:'OK'  
//     }
//     return res.send({ epg, error:err});
//   }

//   let dataSend = [];
//   let allKeys = myCache.keys();

//   allKeys.forEach(function(element){
//     let data=myCache.get(element)
//     data.forEach(function(ev){
//       dataSend.push(ev);
//     })
//   })

//   let channels=[{
//     epgID:req.query.epgID,
//     events:dataSend
//   }]

//   let epg=[{
//     start:req.query.tstart,
//     end:req.query.tend,
//     channels:channels
//   }]
//   let err={
//     code:'200',
//     desc:'OK'  
//   }
//   return res.send({ epg, error:err});
// })

app.get('/event/:id', function (req, res){
  
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

app.get('/event/:id/image', function (req, res){
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
  

console.log("Branch test");





