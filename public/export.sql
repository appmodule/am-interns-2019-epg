USE bds;

SELECT
   distinct(icon)
FROM
    channel_event
WHERE 
    start > "2020-01-12"
INTO OUTFILE '/var/lib/mysql/export.csv'
LINES TERMINATED BY '\r\n';