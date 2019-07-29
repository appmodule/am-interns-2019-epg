var mysql = require('mysql');
var NodeCache = require('node-cache');
var HashMap = require('hashmap');

var parsingxml = require('./parsingxml');
var {db_host, db_user, db_password, db_name,image_folder} = require('./config.js');

var jsonProgramms = parsingxml.jsonProgramms;
var jsonChannels = parsingxml.jsonChannels;
  
String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

class Database {
    constructor( config ) {
        this.connection = mysql.createConnection( config );
    }
    query(sql) {
        return new Promise( ( resolve, reject ) => {
            this.connection.query( sql,( err, rows ) => {
                if ( err )
                    return reject( err );
                resolve( rows );
            } );
        } );
    }
    close() {
        return new Promise( ( resolve, reject ) => {
            this.connection.end( err => {
                if ( err )
                    return reject( err );
                resolve();
            } );
        } );
    }
}

var db= new Database({
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
          var slika=null
    
          /*
          mkdir -p {0,1,2,3,4,5,6,7,8,9,a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,z,y,A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z}/{0,1,2,3,4,5,6,7,8,9,a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,z,y,A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z}
          Position to 'path/to/file->/public/images' and enter the command in the terminal
          */
          if(icon!=null){
            var opt = {
              url: icon,
              dest: image_folder             
            }
            slika = opt.url.lastIndexOf("/");
            slika = opt.url.substring(slika, opt.url.size);
            opt.dest=opt.dest+'/'+slika[1]+'/'+slika[2];
            slika = opt.dest + slika;
            str='.'+
            downloadIMG(opt);
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
        /////////////////////////////////////////////////////
        //////////////Variable validation END////////////////
        /////////////////////////////////////////////////////
            let tSum = startTimestamp + stopTimestamp;

            //eventName = eventName.replace("(lang=de)","");

            eventNameHash = element["title"]["text"];
            eventNameHash = eventNameHash.replace("(lang=de)","");
            eventNameHash = eventNameHash.replace('\\u','u');

            if (map3.has(eventNameHash + tSum + element["@channel"])){
              return;
            }

            sql = "INSERT INTO channel_event(start, end, timezone, timestamp_start, timestamp_end, channel_display, event_name, lang, description, rating, star_rating, icon, episode_number, subtitle, date, country, presenter, actor, director, image)"
            + "VALUE ('" + startDate + "','" + stopDate + "','" + tz + "'," + startTimestamp + "," + stopTimestamp + ",'" + element["@channel"] + "','" + eventName + "','" + element["title"]["@lang"] + "','"
            + description + "','" + rating + "','" + starRating + "','" + icon + "','" + episodeNumber + "','" + subtitle + "','" + date + "','" + country + "','" + presenter + "','" + actor + "','" + director + "','" + slika + "');";
            
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
          eventNameHash = eventName.replace("\\u","u");
          eventName = eventName.replaceAll("'","''");

          if (Array.isArray(element.category)){
            element.category.forEach(function(el){
              tmp = l = el["text"].replace("(lang=de)","");
              if (!map4.has(eventNameHash + l)){
                l = l.replaceAll("'","''");
                sql = "INSERT INTO event_category(channel_event_name, category_name) VALUE ('" + eventName + "', '" + l + "');";
                map4.set(eventNameHash + tmp, eventNameHash + tmp)
                db.query(sql);
              }
            })
          }
          else{
            tmp = l = element["category"]["text"].replace("(lang=de)","");
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
                sql = "SELECT * FROM channel_event WHERE channel_display ='" + channel.display_name + "';";
                db.query(sql)
                .then(rows=>{
                  myCache.set(channel.display_name, rows);
                })
                
            });
        })
    })
})


async function downloadIMG(option) {
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

module.exports = {myCache,db};
