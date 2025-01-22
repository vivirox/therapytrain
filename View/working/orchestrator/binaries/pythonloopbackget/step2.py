#
# Step 2
#
# Multiply the input number by 5
# Return a success response
#

import base64
import json
import random

test = False
header = "[step2] ";

def log(msg):
    print(header + msg)

def process(req):
    log("entering")
    resp = {} 
    val = int(base64.b64decode(req["Data"])) * 5
    resp["Result"] = "Success"
    resp["StatusCode"] = 200
    resp["ContentType"] = "text/plain"
    resp["Data"] = base64.b64encode(str.encode(str(val))).decode("utf-8")
    log("exiting: " + str(val))
    return resp

def runtest(val):
    req = {}
    req["GUID"] = "abcd"
    req["Data"] = str(val)
    resp = process(req)
    print("Response      : " + json.dumps(resp))
    print("Decoded data  : " + base64.b64decode(resp["Data"]).decode('utf-8'))

if test:
    val = random.randint(0, 100)
    runtest(val)
