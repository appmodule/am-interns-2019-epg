USE bds;

SELECT
   distinct(icon)
FROM
    channel_event
WHERE 
    start > "2020-01-12"
INTO OUTFILE '/tmp/mysql-export/export.csv'
LINES TERMINATED BY '\r\n';