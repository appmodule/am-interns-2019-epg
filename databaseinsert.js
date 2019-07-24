var mysql = require('mysql');
var NodeCache = require('node-cache');
var HashMap = require('hashmap');

var parsingxml = require('./parsingxml');

var jsonProgramms = parsingxml.jsonProgramms;
var jsonChannels = parsingxml.jsonChannels;
  
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'logitech',
    database: 'epg'
});

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
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

var myCache = new NodeCache({stdTTL: 60*60*24});

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

      jsonProgramms.forEach(function(elementPrvi){
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
  
      jsonChannels.forEach(function(element) {
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

    jsonProgramms.forEach(function(element) {
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
        
        
        connection.query(sql, function(queryError, queryResult){
          if(queryError){
            throw queryError;
          }
        });

    });

    //event_category
    jsonProgramms.forEach(function (element){
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

module.exports = {myCache};