USE epg;

SELECT
   distinct(icon)
FROM
    channel_event
WHERE 
    start > "2021-03-07"
INTO OUTFILE '/var/lib/mysql/export.csv'
LINES TERMINATED BY '\r\n';
