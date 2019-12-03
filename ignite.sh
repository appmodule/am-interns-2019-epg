#!/bin/bash



cd /root/am-interns-2019-epg/epg_xml && cp epg_full_*.xml backup/
mv /root/am-interns-2019-epg/epg_xml/epg_full_*.xml epg_full.xml
cd /root/am-interns-2019-epg && node index.js
cd /root/am-interns-2019-epg/epg_xml && rm epg_full.xml
