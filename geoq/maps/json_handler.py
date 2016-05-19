from json import load

def handleUploadedJSON(f):
    with open(f, 'wb+') as data_file:
        data = load(data_file)
        jsonDictionary = {"name":data["name"], "type":data["type"], "url":data["url"]}
        return jsonDictionary