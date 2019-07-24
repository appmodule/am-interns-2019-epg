var fs = require('fs');
var HashMap = require('hashmap');
var express = require('express');
var bodyParser = require('body-parser');
var downloader = require('image-downloader');
var NodeCache = require('node-cache');

var app = express();
var myCache = new NodeCache({stdTTL: 60*60*24});

  

var xmlData = fs.readFileSync('/home/appmodule/Documents/EPG/public/xmlfiles/epg.xml').toString()
var parser = require('fast-xml-parser');
var he = require('he');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
 
var options = {
    attributeNamePrefix : "@",
    attrNodeName: false, //default is 'false'
    textNodeName : "text",
    ignoreAttributes : false,
    ignoreNameSpace : false,
    allowBooleanAttributes : false,
    parseNodeValue : true,
    parseAttributeValue : true,
    trimValues: true,
    cdataTagName: "__cdata", //default is 'false'
    cdataPositionChar: "\\c",
    localeRange: "", //To support non english character in tag/attribute values.
    parseTrueNumberOnly: false,
    attrValueProcessor: a => he.decode(a, {isAttributeValue: true}),//default is a=>a
    tagValueProcessor : a => he.decode(a) //default is a=>a
};

async function downloadIMG(opt) {
  let pom;
  try {
    pom = {fn, img} = await downloader.image(opt)
    //console.log(fn) // => /path/to/dest/image.jpg 
  } catch (e) {
    //console.error(e)
    //icon = null;
  }
  //return pom.fn;
}
 
if( parser.validate(xmlData) === true) { //optional (it'll return an object in case it's not valid)
    var jsonObj = parser.parse(xmlData,options);
}
 
// Intermediate obj
var tObj = parser.getTraversalObj(xmlData,options);
var jsonObj = parser.convertToJson(tObj,options);

// fs.writeFileSync('/home/appmodule/Documents/EPG/public/jsonfiles/epg.json', JSON.stringify(jsonObj, null, 2), function(err)
// {
//     if (err){
//         return console.log(err);
//     }
// });

//console.log(jsonObj);

var jsonKanali = jsonObj.tv.channel;
var jsonProgrami = jsonObj.tv.programme;

 //console.log(jsonKanali);
 //console.log(jsonProgrami);

//var objects = JSON.parse(jsonObj);
//var filtered_objects = objects.filter(function(el) {return (el["@id"] != null);});

// fs.writeFileSync('/home/appmodule/Documents/EPG/public/jsonfiles/epgKANALI.json', JSON.stringify(filtered_objects, null, 2), function(err)
// {
//     if (err){
//         return console.log(err);
//     }
// });

String.prototype.replaceAll = function(search, replacement) {
  var target = this;
  return target.split(search).join(replacement);
};

var mysql = require('mysql');

var connection = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: 'password',
	database: 'epg'
});





connection.connect(function(connectionError){
    if(connectionError){
      throw connectionError;
    }
    var sql;

    sql = "SELECT category_type AS kategorije FROM category;";
    var map = new HashMap();
    let l;
    connection.query(sql, function(queryError, queryResult){
      if (queryError){
        throw queryError;
      }
      queryResult.forEach(el => map.set(el["kategorije"].replaceAll("'","''"), el["kategorije"]));

      jsonProgrami.forEach(function(elementPrvi){
        if (typeof elementPrvi["category"] != 'undefined'){ //&& typeof elementPrvi["category"]["text"] != 'undefined'
          if (Array.isArray(elementPrvi.category)){
            elementPrvi.category.forEach(function (element){
              l = element["text"].replaceAll("'","''");
              l = l.replace("(lang=de)","");
              if (!map.has(l)){
                map.set(l, l);
                sql = "INSERT INTO category(category_type) VALUE('" + l + "');";
                connection.query(sql, function(queryError, queryResult){
                  if (queryError){
                    throw queryError;
                  }
                });
              }
            });
          }
          else{
            l = elementPrvi["category"]["text"].replaceAll("'","''");
            l = l.replace("(lang=de)","");
            if (!map.has(l)){
              map.set(l, l);
              sql = "INSERT INTO category(category_type) VALUE('" + l + "');";
              connection.query(sql, function(queryError, queryResult){
                if (queryError){
                  throw queryError;
                }
              });
            }
          }
        }
      })
    })

    sql = "SELECT display_name FROM channel";
    var map2 = new HashMap();
    connection.query(sql, function(queryError, queryResult){
      if (queryError){
        throw queryError;
      }
      queryResult.forEach(function(element){
        map2.set(element.display_name, element.display_name);
      });
  
      jsonKanali.forEach(function(element) {
        if (element["icon"] == undefined && (map2.has(element["@id"] == false))){
            sql = "INSERT INTO channel(display_name, lang) VALUE ('" + element["@id"] + "','" + element["display-name"]["@lang"] + "');";
            connection.query(sql, function(queryError, queryResult){
              if(queryError){
                throw queryError;
              }
            });
        }
        else if (!map2.has(element["@id"])){
            sql = "INSERT INTO channel(display_name, lang, icon) VALUE ('" + element["@id"] + "','" + element["display-name"]["@lang"] + "','" + element["icon"]["@src"] + "')";
            connection.query(sql, function(queryError, queryResult){
              if(queryError){
                throw queryError;
              }
            });
        }
        //console.log("probam ", sql);
        // connection.query(sql, function(queryError, queryResult){
        //     if(queryError){
        //       throw queryError;
        //     }
        // });
      });
    });
  
    
    //var sql;
    var date;
    var episodeNumber;
    var rating;
    var starRating;
    var subtitle;
    var description;
    //var category;
    var icon;
    //var lang;
    var country;
    var presenter;
    var director;
    var actor;
    var eventName;

    jsonProgrami.forEach(function(element) {
        if (element["desc"] == undefined){
          description = null;
        }
        else{
          description = element["desc"]["text"];
          description = description.replaceAll("'","''");
        }

        if (element["icon"] == undefined){
          icon = null;
        }
        else{
          icon = element["icon"]["@src"];
        }

        if (element["date"] == undefined){
          date = null;
        }
        else{
          date = element["date"];
        }

        if (element["country"] == undefined){
          country = null;
        }
        else{
          country = element["country"]["text"];
        }

        if (element["episode-num"] == undefined){
          episodeNumber = null;
        }
        else{
          episodeNumber = element["episode-num"]["text"];
        }

        if (element["rating"] == undefined){
          rating = null;
        }
        else{
          rating = element["rating"]["value"];
        }

        if (element["sub-title"] == undefined){
          subtitle = null;
        }
        else{
          subtitle = element["sub-title"]["text"];
          subtitle = subtitle.replaceAll("'","''");
        }

        if (element["star-rating"] == undefined){
          starRating = null;
        }
        else{
          starRating = element["star-rating"]["value"];
        }

        if (element["credits"] == undefined){
          presenter = null;
          director = null;
          actor = null;
        }
        else{          
          if (element["credits"]["presenter"] == undefined){
            presenter = null;
          }
          else{
            if (Array.isArray(element["credits"]["presenter"])){
              presenter = "";
              let pom = "";
              element.credits.presenter.forEach(function(z) {
                presenter = presenter + pom + z;
                pom = "\n";
              });
            }
            else{
              presenter = element["credits"]["presenter"];
            }
            presenter = presenter.replaceAll("'","''");
          }

          if (element["credits"]["director"] == undefined){
            director = null;
          }
          else{
            if (Array.isArray(element.credits.director))
            {
              director = "";
              let pom = "";
              element.credits.director.forEach(function(z) {
                director = director + pom + z;
                pom = "\n";
              });
            }
            else{
              director = element["credits"]["director"];
            }
            director = director.replaceAll("'","''");
          }

          if (element["credits"]["actor"] == undefined){
            actor = null;
          }
          else{
            if (Array.isArray(element.credits.actor))
            {
              actor = "";
              let pom = "";
              element.credits.actor.forEach(function(z) {
                actor = actor + pom + z;
                pom = "\n";
              });
            }
            else{
              actor = element["credits"]["actor"];
            }
            actor = actor.replaceAll("'","''");
          }
        }
      var slika=null

/*
mkdir -p {0,1,2,3,4,5,6,7,8,9,a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,z,y,A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z}/{0,1,2,3,4,5,6,7,8,9,a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,z,y,A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z}
Pozicionirati se u 'Putanja/do/projekta/public/images' otvoriti terminal i pokrenuti komandu

*/
      if(icon!=null){
        var opt = {
          url: icon,
          dest: '/home/appmodule/Documents/EPG/public/images'               
        }
        slika = opt.url.lastIndexOf("/");
        slika = opt.url.substring(slika, opt.url.size);
        opt.dest=opt.dest+'/'+slika[1]+'/'+slika[2];
        slika = opt.dest + slika;
        //downloadIMG(opt);
        
      }

        eventName = element["title"]["text"].replaceAll("'","''");
        eventName = eventName.replace("(lang=de)","");

        var yearStart=element["@start"].substring(0,4)
        var monthStart=element["@start"].substring(4,6)
        var dayStart=element["@start"].substring(6,8)
        var hourStart=element["@start"].substring(8,10)
        var minuteStart= element["@start"].substring(10,12)
        var secondStart=element["@start"].substring(12,14)
        var signStart=element["@start"].substring(15,16)
        var timeZoneStart=element["@start"].substring(16,18)
        var ms=0

        var yearStop=element["@stop"].substring(0,4)
        var monthStop=element["@stop"].substring(4,6)
        var dayStop=element["@stop"].substring(6,8)
        var hourStop=element["@stop"].substring(8,10)
        var minuteStop= element["@stop"].substring(10,12)
        var secondStop=element["@stop"].substring(12,14)
        var signStop=element["@stop"].substring(15,16)
        var timeZoneStop=element["@stop"].substring(16,18)

        var startTimestamp= new Date(yearStart,monthStart,dayStart,hourStart,minuteStart,secondStart,ms).getTime()
        //var startDate=new Date(yearStart,monthStart,dayStart,hourStart,minuteStart,secondStart,ms)
        var startDate=yearStart+"-"+monthStart+"-"+dayStart+" "+hourStart+":"+minuteStart+":"+secondStart
        if(signStart==='+')
            startTimestamp+=timeZoneStart*3600000//1h=3,600,000ms
        else
        startTimestamp-=timeZoneStart*3600000

        var stopTimestamp= new Date(yearStop,monthStop,dayStop,hourStop,minuteStop,secondStop,ms).getTime()
        //var stopDate=new Date(yearStop,monthStop,dayStop,hourStop,minuteStop,secondStop,ms)
        var stopDate=yearStop+"-"+monthStop+"-"+dayStop+" "+hourStop+":"+minuteStop+":"+secondStop

        if(signStop==='+')
            stopTimestamp+=timeZoneStop*3600000
        else
            stopTimestamp-=timeZoneStop*3600000

        var tz="GMT"+signStart+timeZoneStart


        sql = "INSERT INTO channel_event(start, end, timezone, timestamp_start, timestamp_end, channel_display, event_name, lang, description, rating, star_rating, icon, episode_number, subtitle, date, country, presenter, actor, director, image)"
        + "VALUE ('" + startDate + "','" + stopDate + "','" + tz + "'," + startTimestamp + "," + stopTimestamp + ",'" + element["@channel"] + "','" + eventName + "','" + element["title"]["@lang"] + "','"
        + description + "','" + rating + "','" + starRating + "','" + icon + "','" + episodeNumber + "','" + subtitle + "','" + date + "','" + country + "','" + presenter + "','" + actor + "','" + director + "','" + slika + "');";
        
        //console.log(sql);
        
        connection.query(sql, function(queryError, queryResult){
          if(queryError){
            throw queryError;
          }
        });

    });

    //event_category
    jsonProgrami.forEach(function (element){
      var program_id;
      var kategorija_id;

      sql = "SELECT id FROM channel_event WHERE start = " + element["@start"].substring(0,14) + " AND end = " + element["@stop"].substring(0,14) + " AND channel_display = '" + element["@channel"] +"';";
      connection.query(sql, function(queryError, queryResult){
        if (queryError){
          throw queryError;
        }
        program_id = queryResult[0].id;
        
        if (typeof element["category"] != 'undefined'){

          if (Array.isArray(element.category)){
            element.category.forEach(function (el){
              l = el["text"].replaceAll("'","''");
              l = l.replace("(lang=de)","");
              sql = "SELECT id FROM category WHERE category_type = '" + l + "';";
              connection.query(sql, function(queryError, queryResult){
                if (queryError){
                  throw queryError;
                }
                kategorija_id = queryResult[0].id;

                sql = "INSERT INTO event_category(channel_event_id, category_id) VALUE (" + program_id + ", " + kategorija_id + ");";

                connection.query(sql, function(queryError, queryResult){
                  if (queryError){
                    throw queryError;
                  }
                });
              });
            });
          }
          else{
            l = element["category"]["text"].replaceAll("'","''");
            l = l.replace("(lang=de)","");
            sql = "SELECT id FROM category WHERE category_type = '" + l + "';";
            connection.query(sql, function(queryError, queryResult){
              if (queryError){
                throw queryError;
              }
              kategorija_id = queryResult[0].id;

              sql = "INSERT INTO event_category(channel_event_id, category_id) VALUE (" + program_id + ", " + kategorija_id + ");";

              connection.query(sql, function(queryError, queryResult){
                if (queryError){
                  throw queryError;
                }
              });
            });
          }
        }

      });
    });

    sql = "SELECT * FROM channel"
    connection.query(sql, function(queryError, queryResult){
      if (queryError){
        throw queryError;
      }
      queryResult.forEach(function(kanal){
        sql = "SELECT * FROM channel_event WHERE channel_display ='" + kanal.display_name + "';";
        if (queryError){
          throw queryError;
        }
        connection.query(sql, function(querryErro, queryResult){
          if (queryError){
            throw queryError;
          }
          myCache.set(kanal.display_name, queryResult);
        });
      });
    });

});

//REST API
var sqlAPI;
//sve kategorije
app.get('/category', function (req, res) {
  sqlAPI = "SELECT category_type FROM category";
  connection.query(sqlAPI, function (error, results, fields) {
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
    let zaSlanje = [];
    programi.forEach(function(element){
      // (element.timestampStart >= tstart && element.timestampEnd <= tend) || 
      if ((element.timestamp_end <= tend && element.timestamp_end >= tstart) || (element.timestamp_start >= tstart && element.timestamp_start <= tend)){
        zaSlanje.push(element);
      }
    });
    let epg={
      start:req.query.tstart,
      end:req.query.tend,
      channels:{
        epgID:req.query.channel_name,
        events:zaSlanje
      }
    }
    let err={
      code:'200',
      desc:'OK'  
    }
    return res.send({ epg, error:err});
  }

  let zaSlanje = [];
  let kljucevi = myCache.keys();

  kljucevi.forEach(function(element){
    zaSlanje.push(myCache.get(element));
  })

  let epg={
    channels:{
      epgID:req.query.channel_name,
      events:zaSlanje
    }
  }
  let err={
    code:'200',
    desc:'OK'  
  }
  return res.send({ epg, error:err});
  // sqlAPI = "SELECT id, event_name, channel_display, start, end, description, icon, rating, star_rating, subtitle, episode_number, date, country, presenter, director, actor FROM channel_event"
  // if (typeof req.query.category != 'undefined'){
  //   let pom = req.query.category;
  //   sqlAPI = "SELECT channel_event.id, event_name, channel_display, start, end, description, icon, rating, star_rating, subtitle, episode_number, date, country, presenter, director, actor FROM channel_event, category, event_category "
  //   + "WHERE channel_event.id = event_category.channel_event_id AND category.id = event_category.category_id AND "
  //   + "category_type = '" + pom + "'";
  // }

  // if (typeof req.query.date != 'undefined'){
  //   let pom = req.query.date;
  //   sqlAPI = "SELECT id, event_name, channel_display, start, end, description, icon, rating, star_rating, subtitle, episode_number, date, country, presenter, director, actor FROM channel_event "
  //   + "WHERE DATE(start) = '" + pom + "' OR DATE(end) = '" + pom + "'";
  // }

  // if (typeof req.query.datetime != 'undefined'){
  //   let pom = req.query.datetime;
  //   sqlAPI = "SELECT id, event_name, channel_display, start, end, description, icon, rating, star_rating, subtitle, episode_number, date, country, presenter, director, actor FROM channel_event "
  //   + "WHERE start = '" + pom + "' OR end = '" + pom + "' LIMIT 100";
  // }

  // if (typeof req.query.tstart != 'undefined' && typeof req.query.tend != 'undefined'){
  //   let pom1 = req.query.tstart;
  //   let pom2 = req.query.tend;
  //   sqlAPI = "SELECT id, event_name, channel_display, start, end, description, icon, rating, star_rating, subtitle, episode_number, date, country, presenter, director, actor FROM channel_event "
  //   + "WHERE timestamp_start = '" + pom1 + "' OR timestamp_end = '" + pom2 + "'";
  // }

  // if(typeof (req.query.channel_name) != 'undefined'){
  //   let pom = req.query.channel_name;
  //   sqlAPI = "SELECT * FROM channel_event WHERE channel_display= '"+ pom +"' LIMIT 50";
  // }

  // if (typeof req.query.channel_name != 'undefined' && typeof req.query.tstart != 'undefined' && typeof req.query.tend != 'undefined'){
  //   let pom1 = req.query.channel_name;
  //   let pom2 = req.query.tstart;
  //   let pom3 = req.query.tend;
  //   // if (typeof myCache.get(pom1 + pom2 + pom3) != 'undefined'){
  //   //   return res.send(myCache.get(pom1 + pom2 + pom3));
  //   // }
  //   //>=, <= mozda bolje > ili <
  //   sqlAPI = "SELECT * FROM channel_event WHERE channel_display = '" + pom1 + "' AND ((timestamp_start >= '" + pom2 + "' AND timestamp_end <= '" + pom3 + "') OR (timestamp_end <= '"+pom3+"' AND timestamp_end >= '"+pom2+"') OR (timestamp_start >= '"+pom2+"' AND timestamp_start <= '"+pom3+"'))";
  // }

  // connection.query(sqlAPI, function (error, results, fields) {
  //     if (error){
  //       throw error;
  //     }

      // let epg={
      //   start:req.query.tstart,
      //   end:req.query.tend,
      //   channels:{
      //     epgID:req.query.channel_name,
      //     events:results
      //   }
      // }
      // let err={
      //   code:'200',
      //   desc:'OK'  
      // }
  //     //console.log(myCache.get(req.query.channel_name + req.query.tstart + req.query.tend));
  //     //myCache.set(req.query.channel_name + req.query.tstart + req.query.tend, {epg});
  //     return res.send({ epg, error:err});
  // });
});

app.get('/event/:id', function (req, res){
  let pom = req.params.id;
  sqlAPI = "SELECT * FROM channel_event WHERE id = " + pom;
  connection.query(sqlAPI, function (error, results, fields) {
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
  connection.query(sqlAPI, function (error, results, fields) {
    if (error){
      throw error;
    }
    // let epg={
    //   start:req.query.tstart,
    //   end:req.query.tend,
    //   channels:{
    //     epgID:req.query.channel_name,
    //     events:results
    //   }
    // }
    // let err={
    //   code:'200',
    //   desc:'OK'  
    // }
    if (typeof results[0] == "undefined" || results[0].image == 'null'){
      return res.send({error: 'IMAGE NOT FOUND'})
    }
    else{
      return res.sendfile(results[0].image);
    }
    //return res.send({ epg, error:err});
  });
});

//app.use(express.static('/home/appmodule/Documents/EPG/public/images'));

app.listen(3000, function (){
  console.log('Node app is running on port 3000');
});


module.exports = app;