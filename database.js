var mysql = require('mysql');
var NodeCache = require('node-cache');
var HashMap = require('hashmap');
var downloader = require('image-downloader');
var Database = require('./databaseclass.js')

var parsingxml = require('./parsingxml');
var {db_host, db_user, db_password, db_name,image_folder} = require('./config.js');

var jsonProgramms = parsingxml.jsonProgramms;
var jsonChannels = parsingxml.jsonChannels;
  
String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

var db = new Database({
    host: db_host,
    user: db_user,
    password: db_password,
    database: db_name
});

var myCache = new NodeCache({stdTTL: 60*60*24});
var map = new HashMap();
var map2=new HashMap();
var map3 = new HashMap();
var map4 = new HashMap();

db.connection.connect(function(connectionError){
    if(connectionError){
      throw connectionError;
    }
    let sql="SELECT category_type AS category FROM category;"

    let l;
    db.query(sql)
    .then(rows=>{
        rows.forEach(el => map.set(el["category"].replaceAll("'","''"), el["category"]));
        jsonProgramms.forEach(function(element){
            if (typeof element["category"] != 'undefined'){ //&& typeof element["category"]["text"] != 'undefined'
              if (Array.isArray(element.category)){
                element.category.forEach(function (element){
                  l = element["text"].replaceAll("'","''");
                  l = l.replace("(lang=de)","");
                  l = l.replace("(lang=fr)","");
                  l = l.replace("(lang=it)","");
                  if (!map.has(l)){
                    map.set(l, l);
                    sql = "INSERT INTO category(category_type) VALUE('" + l + "');";
                    db.query(sql)
                  }
                });
              }
              else{
                l = element["category"]["text"].replaceAll("'","''");
                l = l.replace("(lang=de)","");
                l = l.replace("(lang=fr)","");
                l = l.replace("(lang=it)","");
                if (!map.has(l)){
                  map.set(l, l);
                  sql = "INSERT INTO category(category_type) VALUE('" + l + "');";
                  db.query(sql)
                }
              }
            }
        })
    })
    .then(()=>{
        sql = "SELECT display_name FROM channel"
        return db.query(sql);
    })
    .then(rows=>{
        rows.forEach(function(element){
            map2.set(element.display_name, element.display_name);
        });
        jsonChannels.forEach(function(element) {
            if (element["icon"] == undefined && !map2.has(element["@id"])){
                sql = "INSERT INTO channel(display_name, lang) VALUE ('" + element["@id"] + "','" + element["display-name"]["@lang"] + "');";
                db.query(sql)
                .then(()=>{map2.set(element["@id"])})
            }
            else if (element['icon'] != undefined && !map2.has(element["@id"])){
                sql = "INSERT INTO channel(display_name, lang, icon) VALUE ('" + element["@id"] + "','" + element["display-name"]["@lang"] + "','" + element["icon"]["@src"] + "')";
                db.query(sql)
                .then(()=>{map2.set(element["@id"])})
            }
        });
    })
    .then(()=>{ 
        sql = "SELECT event_name, channel_display, timestamp_start, timestamp_end FROM channel_event;";
        return db.query(sql)
    })
    .then(rows=> {
        rows.forEach(function(element){
          let tCombine = element.timestamp_start + element.timestamp_end;
          map3.set(element.event_name + tCombine + element.channel_display, element.event_name + tCombine + element.channel_display);
        })

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
        /////////////////////////////////////////////////////
        //////////////Variable validation START//////////////
        /////////////////////////////////////////////////////
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
          var img=null
    
          /*
          mkdir -p {0,1,2,3,4,5,6,7,8,9,a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,z,y,A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z}/{0,1,2,3,4,5,6,7,8,9,a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,z,y,A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z}
          Position to 'path/to/file->/public/images' and enter the command in the terminal
          */
    
            eventName = element["title"]["text"].replaceAll("'","''");
            eventName = eventName.replace("(lang=de)","");
            eventName = eventName.replace("(lang=it)","");
            eventName = eventName.replace("(lang=fr)","");

            var startDate=element["@start"];
            var stopDate=element["@stop"]
            var startTimestamp=element.start_timestamp;
            var stopTimestamp=element.stop_timestamp;
            var tz=element.timezone

        /////////////////////////////////////////////////////
        //////////////Variable validation END////////////////
        /////////////////////////////////////////////////////
            let tSum = startTimestamp + stopTimestamp;

            eventNameHash = element["title"]["text"];
            eventNameHash = eventNameHash.replace("(lang=de)","");
            eventNameHash = eventNameHash.replace("(lang=it)","");
            eventNameHash = eventNameHash.replace("(lang=fr)","");
            eventNameHash = eventNameHash.replace('\\u','u');

            if (map3.has(eventNameHash + tSum + element["@channel"])){
              return;
            }

            if(icon!=null){
              var opt = {
                url: icon,
                dest: image_folder             
              }
              img = opt.url.lastIndexOf("/");
              img = opt.url.substring(img, opt.url.size);
              opt.dest=opt.dest+'/'+img[1]+'/'+img[2];
              img = opt.dest + img;
              str='.'+
              downloadIMG(opt);
            }

            sql = "INSERT INTO channel_event(start, end, timezone, timestamp_start, timestamp_end, channel_display, event_name, lang, description, rating, star_rating, icon, episode_number, subtitle, date, country, presenter, actor, director, image)"
            + "VALUE ('" + startDate + "','" + stopDate + "','" + tz + "'," + startTimestamp + "," + stopTimestamp + ",'" + element["@channel"] + "','" + eventName + "','" + element["title"]["@lang"] + "','"
            + description + "','" + rating + "','" + starRating + "','" + icon + "','" + episodeNumber + "','" + subtitle + "','" + date + "','" + country + "','" + presenter + "','" + actor + "','" + director + "','" + img + "');";
            
            //map3.set(eventNameHash + tSum + element["@channel"], eventName + tSum + element["@channel"]);
            db.query(sql).then(()=>{map3.set(eventNameHash + tSum + element["@channel"], eventName + tSum + element["@channel"])});
        })
    })
  //})
    .then(()=>{
      var eventName;
      var eventNameHash;

      sql = "SELECT channel_event_name AS event, category_name AS category FROM event_category;";
      db.query(sql)
      .then(rows=>{
        rows.forEach(function(element){
          map4.set(element.event + element.category, element.event + element.category);
        })
        let l;
        let tmp;
        jsonProgramms.forEach(function(element){
          if (typeof element["category"] == 'undefined'){
            return;
          }
          eventName = element["title"]["text"].replace("(lang=de)","");
          eventName = eventName.replace("(lang=it)","");
          eventName = eventName.replace("(lang=fr)","");

          eventNameHash = eventName.replace("\\u","u");
          eventName = eventName.replaceAll("'","''");

          if (Array.isArray(element.category)){
            element.category.forEach(function(el){
              l = el["text"].replace("(lang=de)","");
              l = l.replace("(lang=it)","");
              tmp = l = l.replace("(lang=fr)","");
              if (!map4.has(eventNameHash + l)){
                l = l.replaceAll("'","''");
                sql = "INSERT INTO event_category(channel_event_name, category_name) VALUE ('" + eventName + "', '" + l + "');";
                map4.set(eventNameHash + tmp, eventNameHash + tmp)
                db.query(sql);
              }
            })
          }
          else{
            l = element["category"]["text"].replace("(lang=de)","");
            l = l.replace("(lang=it)","");
            tmp = l = l.replace("(lang=fr)","");
            if (!map4.has(eventNameHash + l)){
              l = l.replaceAll("'","''");
              sql = "INSERT INTO event_category(channel_event_name, category_name) VALUE ('" + eventName + "', '" + l + "');";
              map4.set(eventNameHash + tmp, eventNameHash + tmp);
              db.query(sql);
            }
          }
        })
      })
    })
    .then(()=>{
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
    })
})


async function downloadIMG(option) {
    let pom;
    try {
        pom = {fn, img} = await downloader.image(option)
        //console.log(fn) // => /path/to/dest/image.jpg 
    } catch (e) {
        console.log(e)
        //icon = null;
    }
    //return pom.fn;
}

module.exports = {myCache,db};
