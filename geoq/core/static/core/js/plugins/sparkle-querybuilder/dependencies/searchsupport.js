var IRIMap = {}
var hierarchylist = [""]
//Creates a tree hierarchy from a flat list also populates a map for URI to String
function treeify(list, idAttr, parentAttr, childrenAttr) {
    if (!idAttr) idAttr = 'sub';
    if (!parentAttr) parentAttr = 'obj';
    if (!childrenAttr) childrenAttr = 'children';
    var treeList = [];
    var lookup = {};
    list.forEach(function(obj) {
        var dictionaryholder = {}
        var itemURI = obj['sub']['value']
        dictionaryholder['item_uri'] = itemURI
        dictionaryholder['itemString'] = IRIConverter(itemURI)
        if(IRIMap[itemURI] == null){
            IRIMap[itemURI] = IRIConverter(itemURI);
        }
        
        lookup[obj['sub']["value"]] = dictionaryholder;
        dictionaryholder['children'] = [];
        dictionaryholder['parentURI'] = '';
        // have to check if the objects as well as the subjects need to be added to tree structure
        if (obj["pred"]["value"] == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
            var additionaldictionary = {}
            additionaldictionary['item_uri'] = obj['obj']['value']
            additionaldictionary['itemString'] = IRIConverter(obj['obj']['value'])
            if(IRIMap[obj['obj']['value']] == null){
                IRIMap[obj['obj']['value']] = IRIConverter(obj['obj']['value']);
            }
            lookup[obj['obj']['value']] = additionaldictionary;
            additionaldictionary['children'] = [];
            additionaldictionary['parentURI'] = ''
        }
        
    });
    list.forEach(function(obj) {
        //Check to see if the predicate relationship is type
        if (obj["pred"]["value"] == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
            var parent_dictobj = lookup[obj['obj']['value']]
            var child_dictobj = lookup[obj['sub']['value']]
            parent_dictobj['children'].push(child_dictobj);
            child_dictobj['parentURI'] = parent_dictobj['item_uri']
        } 
    });
    for(var key in lookup){
        dictobj = lookup[key];
        if (dictobj['parentURI'] == ''){
            treeList.push(dictobj);
        }
    }
    /*
    list.forEach(function(obj) {
        if (obj["pred"]["value"] == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") {
            var parent_dictobj = lookup[obj['obj']['value']]
            if (parent_dictobj['parentURI'] == ''){
                treeList.push(parent_dictobj);
            }
        } 
    })
    */
    return treeList;
};

function IRIConverter(IRIString){
    var irisplit = IRIString.split("/")
    var objstr = irisplit[irisplit.length - 1]
    objsplit = objstr.split("_")
    return objsplit.join(" ")
}

//Uses the map to get the Parsed Item String from the URI String
function getItemString(URIString){
    return IRIMap[URIString];
}

//Reverse iterates through the map to find the URI that matches the readable Item String
function getURIString(ItemString){
    for(var key in IRIMap){
        if (IRIMap[key] == ItemString){
            return key
        }
    }

}
var hierarchytree;
$.ajax({
        headers: {
            'accept': 'application/json',
            "content-type": 'application/sparql-query'
           
        },
        url: 'http://geoq-testing:8080/sparql',
        type: 'POST',
        data: "SELECT * WHERE { ?sub ?pred ?obj . } LIMIT 70",
        //dataType: 'jsonp',
        crossdomain: true,

        success: function (data) {
            console.log("Success on AJAX call")
            console.log(data)
            var flatlist = data["results"]["bindings"]
            hierarchytree = treeify(flatlist)
            console.log(hierarchytree);
            renderAutoCompleteInput();
        },
        error: function (xhr,status,error){
            console.log("ERROR")
            console.log(xhr)
            console.log(status)
            console.log(error)
        }
    });

    //Looks through the hierarchy tree created and pulls all the parents at the top level
    function retrieveTopLevelHierarchy(){
        var strarray = []
        hierarchytree.forEach(function(elem) {
            strarray.push(elem["itemString"])
        })
        return strarray;

    }

    function retrieveLevelBelow(){
        var strarray = []
        var dictholder;
        var arrholder = hierarchytree;

        for(var i = 0; i < hierarchylist.length; i++) {
            var input = hierarchylist[i]
            for(var counter = 0; counter < arrholder.length; counter++) {
                var dictelem = arrholder[counter]
                console.log(dictelem['itemString']);
                console.log(dictelem['itemString'] == input);
                if (dictelem['itemString'].localeCompare(input) == 0) {
                    console.log("SUCCESSFULLY FOUND")
                    arrholder = dictelem['children']
                    console.log(arrholder);
                    break;
                }
            }
        }
        var strarray = []
        arrholder.forEach(function(elem) {
            strarray.push(elem["itemString"])
        })
        console.log(strarray);
        return strarray;
    }



    function renderAutoCompleteInput() {
        /*
        var qb = new Bloodhound({
            datumTokenizer: Bloodhound.tokenizers.whitespace,
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            local: ["hello", "help", "uh oh", "testing", "dummy", "data"]
        });

        //var input = $('input[data-role="tagsinput"]')
        //var input = document.getElementById("autocomplete_id")
        $('.typeahead').typeahead({
            hint: true,
            highlight: true,
            minLength: 1
        },
        {name: "testing",
        source: qb});
        */

        var inputoneSource = new Bloodhound({
            datumTokenizer: Bloodhound.tokenizers.whitespace,
            queryTokenizer: Bloodhound.tokenizers.whitespace,
            local: retrieveTopLevelHierarchy()
        });
        $('#input_one').typeahead({
            hint: true,
            highlight: true,
            minLength: 1
        },
        {name: "highestlevel",
        source:inputoneSource});

        var inputOneElem = document.querySelector('#input_one');

        inputOneElem.addEventListener('change', (event) => {
            console.log(event.target.value);
            hierarchylist[0] = event.target.value;
            var inputTwoElem = document.querySelector('#input_two')
            inputTwoElem.value = "";
            $('#input_two').typeahead('destroy');
            var inputtwoSource = new Bloodhound({
                datumTokenizer: Bloodhound.tokenizers.whitespace,
                queryTokenizer: Bloodhound.tokenizers.whitespace,
                local: retrieveLevelBelow()
            });
            $('#input_two').typeahead({
                hint: true,
                highlight: true,
                minLength: 1
            },
            {name: "secondlevel",
            source:inputtwoSource});
        });
    
    }

    

