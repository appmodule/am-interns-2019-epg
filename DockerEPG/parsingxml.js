var parser = require('fast-xml-parser');
var he = require('he');
var express = require('express');
var fs = require('fs');
var bodyParser = require('body-parser');
var {xmlFileRead, jsonFileWrite} = require('./config.js');

Number.prototype.padLeft = function(base,chr){
    var  len = (String(base || 10).length - String(this).length)+1;
    return len > 0? new Array(len).join(chr || '0')+this : this;
}

var app = express();
var xmlData = fs.readFileSync(xmlFileRead).toString()

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

var tObj = parser.getTraversalObj(xmlData,options);
var jsonObj = parser.convertToJson(tObj,options);

var jsonChannels = jsonObj.tv.channel;
var jsonProgramms = jsonObj.tv.programme;

fs.writeFileSync(jsonFileWrite, JSON.stringify(jsonObj, null, 2), function(err)
{
    if (err){
        return console.log(err);
    }
});


let programmeArr=[]
jsonProgramms.forEach((element)=>{

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




    var startTimestamp= new Date(yearStart,monthStart-1,dayStart,hourStart,minuteStart,secondStart,ms).getTime()
    //var startDate=new Date(yearStart,monthStart,dayStart,hourStart,minuteStart,secondStart,ms)
    var startDate=yearStart+"-"+monthStart+"-"+dayStart+" "+hourStart+":"+minuteStart+":"+secondStart
    if(signStart==='+')
        startTimestamp+=timeZoneStart*3600000//1h=3,600,000ms
    else
    startTimestamp-=timeZoneStart*3600000

    var stopTimestamp= new Date(yearStop,monthStop-1,dayStop,hourStop,minuteStop,secondStop,ms).getTime()
    //var stopDate=new Date(yearStop,monthStop,dayStop,hourStop,minuteStop,secondStop,ms)
    var stopDate=yearStop+"-"+monthStop+"-"+dayStop+" "+hourStop+":"+minuteStop+":"+secondStop

    if(signStop==='+')
        stopTimestamp+=timeZoneStop*3600000
    else
        stopTimestamp-=timeZoneStop*3600000

    var tz="GMT"+signStart+timeZoneStart

    var startTimestamp= new Date(startTimestamp).getTime()

    element["@start"]=startDate;
    element["@stop"]=stopDate;
    element.start_timestamp=startTimestamp;
    element.stop_timestamp=stopTimestamp;
    element.timezone=tz
    programmeArr.push(element)
})
let count=0
for (let i=0;i<programmeArr.length-1;i++){
    //console.log(programmeArr.length)
    if(programmeArr[i]["@stop"]!=programmeArr[i+1]["@start"]
        && programmeArr[i]["@channel"]==programmeArr[i+1]["@channel"]){
        let name= programmeArr[i]["@channel"]
         let element={
            '@start':programmeArr[i]["@stop"],
            '@stop':programmeArr[i+1]["@start"],
            title:{
                text:'No Channel EPG',
                '@lang':'no'
            },
            '@channel':name,
        }
        let prevStop=programmeArr[i].stop_timestamp;//here
        let nextStart=programmeArr[i+1].start_timestamp//here
        element.start_timestamp=prevStop
        if((nextStart-prevStop)>3600000){
            element.stop_timestamp=prevStop+3600000
            //element["@stop"]=
            var d = new Date(element.stop_timestamp);
            let dformat = [d.getFullYear(),
                (d.getMonth()+1).padLeft(),
               d.getDate().padLeft()
               ].join('-') +' ' +
              [d.getHours().padLeft(),
               d.getMinutes().padLeft(),
               d.getSeconds().padLeft()].join(':');
            element["@stop"]=dformat;
            console.log(dformat);
        }
        else{
            element.stop_timestamp=nextStart
        }
        
        //element.stop_timestamp=programmeArr[i+count+1].start_timestamp
        element.timezone=programmeArr[i].timezone//here

        
        console.log("start: "+element.start_timestamp+" stop: "+element.stop_timestamp)
        programmeArr.splice(i+1,0,element)//here
        //count=count+1
    }
}
jsonProgramms=programmeArr

module.exports = {jsonChannels, jsonProgramms};