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

app.get('/event', function (req, res) {
  if (typeof req.query.tstart != 'undefined' && typeof req.query.tend != 'undefined' && typeof req.query.epgID != 'undefined'){
    let tstart = req.query.tstart;
    let tend = req.query.tend;
    let programi = myCache.get(req.query.epgID);
    let dataSend = [];

    if (typeof programi == 'undefined'){
      return res.send({error: 'MISSING ID'});
    }

    programi.forEach(function(element){
      if ((element.timestamp_end <= tend && element.timestamp_end >= tstart) || (element.timestamp_start >= tstart && element.timestamp_start <= tend)){
        dataSend.push(element);
      }
    });
    let epg={
      start:req.query.tstart,
      end:req.query.tend,
      channels:{
        epgID:req.query.channel_name,
        events:dataSend
      }
    }
    let err={
      code:'200',
      desc:'OK'  
    }
    return res.send({ epg, error:err});
  }

  let dataSend = [];
  let allKeys = myCache.keys();

  allKeys.forEach(function(element){
    dataSend.push(myCache.get(element));
  })

  let epg={
    channels:{
      epgID:req.query.channel_name,
      events:dataSend
    }
  }
  let err={
    code:'200',
    desc:'OK'  
  }
  return res.send({ epg, error:err});
});

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





