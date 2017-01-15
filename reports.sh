#!/bin/bash

# User can specify a list of regions on the command line,
# or if none use these defaults
REGIONS=${@:-"us-east-1 us-east-2 us-west-1 us-west-2"}

echo "Generating reports"
date_prefix=`date '+%Y-%m-%d'`
for region in ${REGIONS}
do
  report_name="${date_prefix}-${region}.html"
  node ri-report.js ${region} > ${report_name}
  result=$?
  if [ $result -eq 0 ]
    then
       echo "  ${report_name}"
    else
       echo "  ${report_name} -- failed (bad region?)"
  fi
done
