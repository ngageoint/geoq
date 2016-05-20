from json import load
from pprint import pprint

def handleUploadedJSON(f):
    data = load(f)
    jsonDictionary = {"name":data["name"], "type":data["type"], "url":data["url"]}
    return jsonDictionary