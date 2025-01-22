#
# Step 1
#
# Generate a random number
# If evenly divisible by 3, return an exception response
# Otherwise return a success response
#

import base64
import json
import random

test = False
header = "[step1] ";

def log(msg):
    print(header + msg)

def process(req):
    log("entering")
    resp = {} 
    rand = 0
    try:
        rand = random.randint(0, 100)
        log("generated " + str(rand))
        if (rand % 3 == 0):
            raise Exception("Generated number was evenly divisible by 3")
        resp["Result"] = "Success"
        resp["StatusCode"] = 200
        resp["ContentType"] = "text/plain"
        resp["Data"] = base64.b64encode(str.encode(str(rand))).decode("utf-8")
    except:
        log("exception raised")
        resp["Result"] = "Exception"
        resp["StatusCode"] = 500
        resp["ContentType"] = "text/plain"
        resp["Data"] = base64.b64encode(str.encode(str(rand))).decode("utf-8")
    log("exiting: " + str(rand))
    return resp

def runtest():
    req = {}
    req["GUID"] = "abcd"
    resp = process(req)
    print("Response      : " + json.dumps(resp))
    print("Decoded data  : " + base64.b64decode(resp["Data"]).decode('utf-8'))

if test:
    runtest()
