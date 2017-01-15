#!/bin/bash
BUCKET_NAME="SOMEBUCKET"
FOLDER="reports"

# User can specify a list of regions on the command line,
# or if none use these defaults
REGIONS=${@:-"us-east-1 us-east-2 us-west-1 us-west-2"}

s3_location="s3://${BUCKET_NAME}/${FOLDER}"
echo "Generating reports to ${s3_location}"
date_prefix=`date '+%Y-%m-%d_%H-%M-%S'`
for region in ${REGIONS}
do
  report_name="${date_prefix}-${region}.html"
  s3_report="${s3_location}/${report_name}"

  # node ri-report.js ${region} > ${report_name}
  node ri-report.js ${region} | aws s3 cp - ${s3_report}
  result=$?
  if [ $result -eq 0 ]
    then
       echo "  ${report_name}"
    else
       echo "  ${report_name} -- failed (bad region?)"
  fi
done