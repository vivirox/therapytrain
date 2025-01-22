#
#
# View.io Python loopback GET step
#
#

#region Imports

import base64
import datetime
import json
import threading
import uuid

#endregion

#region Base-Variables-and-Methods

test = False

severity_values = [
        "Debug",
        "Info",
        "Warn",
        "Error",
        "Alert",
        "Critical",
        "Emergency"
    ]

result_values = [
        "Success",
        "Failure",
        "Exception"
    ]

header = "[LoopbackGet] "
log_console = True

def is_null(str):
    return not (str and str.strip())

def log(sev, msg):
    if not is_null(msg):         
        if (sev not in severity_values):
            raise Exception("Specified severity '" + sev + "' is invalid.")
        log_msg = {}
        log_msg["TimestampUtc"] = datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%S.%f")
        log_msg["Severity"] = sev
        log_msg["Message"] = header + msg

        if log_console:
            print(json.dumps(log_msg))

def bytes_to_base64_string(value: bytes) -> str:
   return base64.b64encode(value).decode("utf-8")

def process(req) -> dict:

    # 
    # Main entrypoint for the step.  The Orchestrator will invoke this method.
    #
    
    log("Debug", "request received" + req["GUID"] + " data: " + req["Data"])
    
    resp = {} 
    resp["Result"] = "Success"
    resp["StatusCode"] = 200
    resp["ContentType"] = "text/plain"
    resp["Data"] = bytes_to_base64_string(bytes("Hello from the loopback GET method", "utf-8"))
    
    return resp

#endregion
     
#region Test

def runtest():
    req = {}
    req["GUID"] = "abcd"
    req["Data"] = "SGVsbG8sIHdvcmxkIQ==" # Hello, world!
    resp = process(req)
    print("Response JSON : " + json.dumps(resp))
    print("Decoded data  : " + base64.b64decode(resp["Data"]).decode('utf-8'))
    
if (test):
    runtest()

#endregion   
    