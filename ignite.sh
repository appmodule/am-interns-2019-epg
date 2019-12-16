#!/bin/bash


now=$(date +"%F")
 
#cd /root/am-interns-2019-epg/epg_xml && cp epg_full_*.xml backup/
# ## mv /root/am-interns-2019-epg/epg_xml/epg_full_*.xml epg_full.xml
curl http://localhost:9000/bds/tv/parse?file=epg_full_$now.xml
# #cd /root/am-interns-2019-epg/epg_xml && rm epg_full_*.xml
cd /root/am-interns-2019-epg/epg_xml && mv epg_full_*.xml backup/
