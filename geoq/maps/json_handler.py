from json import load
from pprint import pprint

def handleUploadedJSON(f):
    try:
        data = load(f)
    except ValueError as e:
        ## bad json
        return None;




    jsonDictionary = {"id":data["id"], "name":data["name"], "format":data["format"], "type":data["type"], "url":data["url"], "subdomains":data["subdomains"],
                      "layer":data["layer"], "transparent":data["transparent"], "layerParams":data["layerParams"], "dynamicParams":data["dynamicParams"],
                      "refreshrate":data["refreshrate"], "token":data["token"], "attribution":data["attribution"], "spatialReference":data["spatialReference"],
                      "layerParsingFunction":data["layerParsingFunction"], "enableIdentify":data["enableIdentify"], "rootField":data["rootField"],
                      "infoFormat":data["infoFormat"], "fieldsToShow":data["fieldsToShow"], "description":data["description"], "downloadableLink":data["downloadableLink"],
                      "layer_info_link":data["layer_info_link"], "styles":data["styles"]}
    return jsonDictionary