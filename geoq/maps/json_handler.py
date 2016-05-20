from json import load
from pprint import pprint

def handleUploadedJSON(f):
    try:
        data = load(f)
    except ValueError as e:
        ## bad json
        return None;
    jsonDictionary = {"name":data["name"], "type":data["type"], "url":data["url"]}
    return jsonDictionary