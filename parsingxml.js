var parser = require('fast-xml-parser');
var he = require('he');
var express = require('express');
var fs = require('fs');
var bodyParser = require('body-parser');

var app = express();
var xmlData = fs.readFileSync('/home/appmodule/Documents/EPG/public/xmlfiles/epg.xml').toString()

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

fs.writeFileSync('/home/appmodule/Documents/EPG/public/jsonfiles/epg.json', JSON.stringify(jsonObj, null, 2), function(err)
{
    if (err){
        return console.log(err);
    }
});

module.exports = {jsonChannels, jsonProgramms};