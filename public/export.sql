USE bds;

SELECT
   distinct(icon)
FROM
    channel_event
WHERE 
    start > "2021-01-21"
INTO OUTFILE '/var/lib/mysql/export.csv'
LINES TERMINATED BY '\r\n';
