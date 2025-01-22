#
# Step Exception
#
# Display the exception
# Return a success response
#

import base64
import json
import random

test = False
header = "[step-exception] ";

def log(msg):
    print(header + msg)

def process(req):
    log("entering: " + req["Data"])
    resp = {} 
    resp["Result"] = "Success"
    resp["StatusCode"] = 200
    resp["ContentType"] = "text/plain"
    resp["Data"] = base64.b64encode(str.encode("Exception raised")).decode("utf-8")
    log("exiting")
    return resp

def runtest():
    req = {}
    req["GUID"] = "abcd"
    req["Data"] = "42"
    resp = process(req)
    print("Response      : " + json.dumps(resp))
    print("Decoded data  : " + base64.b64decode(resp["Data"]).decode('utf-8'))

if test:
    runtest()
