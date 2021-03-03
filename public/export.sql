USE epg;

SELECT
   distinct(icon)
FROM
    channel_event
WHERE 
    start > "2021-03-02"
INTO OUTFILE '/var/lib/mysql/export.csv'
LINES TERMINATED BY '\r\n';
