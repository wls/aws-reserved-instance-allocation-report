AWS Reserved Instance Usage Report
==================================

_A tool for generating a simple visualization of AWS EC2 usage allocations._


AWS's Reserved Instance Billing can be a little confusing for some;
Reserved Instances are cheaper, but it also requires knowing _exactly_
what type of instance type is needed and where it resides.

As EC2 resources are added, removed, and shuffled, it can become easy to
lose track of what's where and _think_ you're getting the benefits of
Reserved Instances when in fact you're not. Or, quite the opposite, you're
using too many Spot Instances and _could_ be benefiting from Reserved
Instances but are not.


Description
-----------
This script (which is still in early development) generates a visual
report of how instances are allocated, allowing quick visual inspection
of how to best reallocate servers, especially across availability zones.

IMPORTANT NOTE: I use this script on an EC2 instance with an AMI Role,
so there's no AWS secrets baked into the script.


Prerequsite: NodeJS with npm
----------------------------
Instructions for installing NodeJS by [source or package](https://nodejs.org/en/download/)
are online.


Install From GitHub
-------------------
    $ git clone git@github.com:wls/aws-reserved-instance-allocation-report.git
    $ cd aws-reserved-instance-allocation-report

Post-Installation
-----------------
    $ npm install             # Gets all the modules (do this only once)

Running
-------
    $ node ri-report.js > report.html  # Generate a report (assumes us-east-1)
    $ firefox report.html              # View the report

Running with a Region
---------------------
    $ node ri-report.js us-west-2 > report.html   # Specify us-west-2 as the desired region
    $ firefox report.html                         # View the report

Running Reports
---------------
    $ ./reports.sh us-east-1 us-west-2 eu-west-1 ap-northeast-1    # Run a lot of regions
    $ ./reports.sh                                                 # Run default of us-east-1 and us-west-2

Reports are generated in the form of `YYYY-MM-DD-region_name.html`.

The script `s3-reports.sh` may be used to send the reports to S3.
Right now, that location is hard coded in the script so you _will_
need to alter the script for your own location (it's a the top).
This is one of those cases where personal need hasn't required
greater flexibiliy.

Likewise, these report scripts have a subset of aws regions that
you're encouraged to modify, as the use case of needing all regions
is fairly rare.


Future Plans
------------
The code was written in JavaScript, with the intent of development on NodeJS.
However, the long term view is that it might run in the browser, or optionally
as a Lambda service that detects when nodes are added, removed, started, or
shutdown, and generates a report that might even be mailed to an admin.

This code was quickly whipped out to scratch an personal itch, but seemed
to provide enough utility worth sharing as I'm sure other people are in the
same boat, especially when multiple people are managing AWS resources.


How It Works Under The Hood
===========================
The system makes use of the AWS SDK, and requests a listing of all the
reserved instances that have been purchased. This identifies the
_reservations_ for all availablity nodes across all the various instance
types.

Then the system does the same thing to inspect the _running_ instances
to get actual counts.

Between both lists, it's possible to compute the super-set of all
declared availabilty zones, reserved or in use, as well as the same
for the instance types.

The system then meshes to two data structures against what it has and
what it could have; the resulting analysis is then presented visually.

Green boxes are efficiently utilizing reserved instances.  Grey boxes are
reserved instances that are not in use.  And Red boxes are instances for
which there could be a reserved instance if needed (to get lower pricing).

The ideal strategy is the pack as many of the red boxes (overuse) into
the grey ones (underrun).
