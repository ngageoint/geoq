from json import load
from pprint import pprint

def handleUploadedJSON(f):
    with open(f, 'wb+') as data_file:
        data = load(data_file)
        jsonDictionary = {"name":data["name"], "type":data["type"], "url":data["url"]}
        pprint(data)
        return jsonDictionary