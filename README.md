# Start routes

To insert events from json file into the database, use route:
http://{{server}}/bds/tv/parse

To get events stored in the database, use route:
http://{{server}}/bds/tv/event

# EPG - BDS

This project is used for parsing, inserting and pulling EPG data. It consists of 3 parts: parsing, inserting into database and RESTfull api.

Parsing part parses XML data into JSON and prepares it for the database.

Filling the database just checks for each json object if it contains all the necessary columns and inserts it. At the end it pulls all the data from database and caches it.

REST api answers request, it sends data from the cached object.

The project is made in node.js and uses MySQL database.

## Necessary node libs are:

- 'mysql'

- 'fast-xml-parser'

- 'he'

- 'express'

- 'body-parser'

- 'fs'

- 'hashmap'

- 'node-cache'

- 'image-downloader'

All these libs are installed with the "npm install x" command.

Parameters are stored in the .env file, change this according to your environment.

__If you want the run the programm with the parsing part, run it with parameter "parse", without parameters the programm will only load data from the database.__

Position to 'path/to/file->/public/images' and enter the command in the terminal, it is used to create necessary folders for storing local images:
mkdir -p {{0..9},{a..z},{A..Z}}/{{0..9},{a..z},{A..Z}}

## parsingxml.js:

Parser part of the project, it uses 'fast-xml-parser' package, for more info about how it works and what it doest visit it's npm package page. XML is loaded from the xmlFileRead env variable and it writes parsed JSON data in the jsonFileWrite env variable. After the parsing and writing into a file is done, each JSON channel object gets two additional attributes, timestamp from their start and end DateTime. This is done so the part with the database is easier to work with. The dates are also changed into a more readable format. At the end those JSON objects are exported.

## database.js:

Database loading part. MySQL database is used, database.js loads exported JSON objects from the parsingxml.file, those files are used to fill the database. databaseclass.js is imported, the simple class Database is there for easier database creation which also makes all the queries promises for easier and cleaner work with them. myCache variable is the caching part and it is created to last for 24 hours, the project is meant to be restarted everyday. All the queries make the strings more friendly for the database like inserting " ' " infront of every " ' " so the database doesn't get confused, also some unecesery values are cut and the data is checked if it already is in the database using hashmaps. First all the categories are inserted, then channels, channel events and at the end even categories, a connection between channel events and categories. This part of the project also downloads a local image with the downloadIMG function.

## databasepullonly.js:

This is called instead of database.js if the project isn't started with the "parse" parameter. It skips the parsingxml.js and just loads the cache with the data from the database.

## index.js:

This is where the project starts and calls all the other files, after they are all finished the REST api part begins. All the request are GET, their URLs explain what they do. The '/tv/event' needs 2 queries to run epgID and time. their url looks like this:
 
> '/tv/event/epgID=somechannel&time=startingtime,endingtime'

You can insert multiple channel names divided by ';' it should look like this:

> '/tv/event/epgID=firstchannel;secondchannel;thirdschannel&time=startingtime,endingtime'
