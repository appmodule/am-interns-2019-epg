#!/bin/bash

# This script is starting from Docker Host, future improvement can be to be started
# from container after parsing is done

source ../env

START_DATE=`date +%Y-%m-%d -d "yesterday"`
sed -i -r "s/(start > \")(.*)(\")/\1${START_DATE}\3/" export.sql
docker exec am-interns-2019-epg_db_1 bash -c "rm /var/lib/mysql/export.csv"
docker cp export.sql am-interns-2019-epg_db_1:/
docker exec am-interns-2019-epg_db_1 bash -c "mysql -u root -p${DB_PASSWORD} < /export.sql"

MAX_CONCURRENT=20
n=0
cat ../db_instances/export.csv  \
| while read url
do
    {
        url=`echo $url | tr -d '\r'`
        name="${url##*/}"
        dir1=${name:0:1}
        dir2=${name:1:1}
        DIR="images/$dir1/$dir2"
        mkdir -p $DIR
        #echo "wget -P $DIR -N $url" >> log.txt
              #echo "Downloading: $url" >> log.txt

        wget -P $DIR -N $url
              # >> log_wget.txt 2>&1
    } &
    PIDS="$PIDS $!"

    ((++n))
    if test "$n" -ge "$MAX_CONCURRENT"
    then
        n=0
        wait $PIDS
        PIDS=""
    fi
done
test -n "$PIDS" && wait $PIDS
