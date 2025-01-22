#
# Step 3
#
# Return the squareroot, rounded to an integer, of the supplied number
# Return a success response
#

import base64
import json
import math
import random

test = False
header = "[step3] ";

def log(msg):
    print(header + msg)

def process(req):
    log("entering")
    resp = {} 
    val = int(base64.b64decode(req["Data"]))
    sqrt = math.sqrt(val)
    rounded = round(sqrt)
    resp["Result"] = "Success"
    resp["StatusCode"] = 200
    resp["ContentType"] = "text/plain"
    resp["Data"] = base64.b64encode(str.encode(str(rounded))).decode("utf-8")
    log("exiting: " + str(rounded))
    return resp

def runtest(val):
    req = {}
    req["GUID"] = "abcd"
    req["Data"] = str(val)
    resp = process(req)
    print("Response      : " + json.dumps(resp))
    print("Decoded data  : " + base64.b64decode(resp["Data"]).decode('utf-8'))

if test:
    val = random.randint(20, 200)
    runtest(val)
