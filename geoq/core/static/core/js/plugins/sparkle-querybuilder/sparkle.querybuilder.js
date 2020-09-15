/*
 Sparkle Query Builder plugin for geoq
 */
var vocabulary = JSON.parse(document.currentScript.getAttribute("vocabulary"))
var sparkle_builder = {};
sparkle_builder.title = "Sparkle Query Builder";
sparkle_builder.plugin_title = "Feature Search";
sparkle_builder.accordion_id = "#layer-control-accordion";

sparkle_builder.$content = null;
sparkle_builder.$accordion = null;
sparkle_builder.map = aoi_feature_edit.map;
sparkle_builder.results_layer_group = null;
sparkle_builder.workcellGeojson = aoi_feature_edit.aoi_extents_geojson;

sparkle_builder.init = function (options) {

    //Add a shim in to fill a jquery version gap
    if (typeof $.curCSS == "undefined") {
        $.curCSS = function (element, attrib, val) {
            $(element).css(attrib, val);
        }
    }
    if (options) sparkle_builder = $.extend(sparkle_builder, options);
    sparkle_builder.$accordion = $(sparkle_builder.accordion_id);
    sparkle_builder.buildAccordionPanel();
    
    if (!sparkle_builder.map && aoi_feature_edit && aoi_feature_edit.map) {
        sparkle_builder.map = aoi_feature_edit.map;
    }

    //Prepare Layer Group
    if (sparkle_builder.map) {
        sparkle_builder.results_layer_group = L.layerGroup()
        sparkle_builder.results_layer_group.addTo(sparkle_builder.map)
    }

};

sparkle_builder.loadOntoSearch = function() {
    let substringMatcher = function (strs) {
        return function findMatches(q, cb) {
          var matches, substringRegex;
          matches = [];
          substrRegex = new RegExp(q, 'i');
          $.each(strs, function (i, str) {
            if (substrRegex.test(str)) {
              matches.push(str);
            }
          });
          cb(matches);
        };
      };

      var terms = vowlHelper.getLabels();

      $('#onto_search').typeahead({
        hint: true,
        highlight: true,
        minLength: 1
      },
              {
                name: 'terms',
                source: substringMatcher(terms)
              }
      );


      $('#onto_search').keyup(function (e) {
          console.log("in search")
        if (e.keyCode == 13 && $("#onto_search").val() != "") {
          console.log("Starting Search")
          results = vowlHelper.byLabel($("#onto_search").val());
          //All Data requrired should be in results
        
          
          $('.typeahead').typeahead('close');
          allResults = listSearchResults(results);
          console.log(results)
          for(var i = 0; i < allResults.length; i++) {
              console.log(allResults[i]["iri"])
          }
          showTermDetails(null);
        }
      });


      function listSearchResults(results) {

        let html = "";
        if (results) {
          totalResults = []
          for (let i = 0; i < results.length; i++) {
            let term = results[i];
            html += "<div class='pointer searchResult ";
            if (i % 2 == 0)
              html += " shaded ";
            html = html + "' data-id='" + term.id + "'>";
            if (term.label["undefined"])
              html += term.label["undefined"];
            else if (term.label["IRI-based"])
              html += term.label["IRI-based"];
            html += "</div>";
          }
          $("#resultHolder").html(html);

          $('.searchResult').each(function(i, obj) {
            localResults = showTermDetailsById($(obj).attr("data-id"))
            totalResults.push(...localResults)
          });

          $(".searchResult").click(function (e) {
            console.log(e)
            let target = $(e.target);
            showTermDetailsById(target.data("id"))
          });
        }

        return totalResults
      }

      function sortByName(a, b) {
        let name1 = "";
        let name2 = "";

        if (a.label["undefined"])
          name1 = a.label["undefined"];
        else if (a.label["IRI-based"])
          name1 = a.label["IRI-based"];

        if (b.label["undefined"])
          name2 = b.label["undefined"];
        else if (b.label["IRI-based"])
          name2 = b.label["IRI-based"];

        let answer = 0;
        if (name1 > name2) {
          answer = 1;
        } else if (name1 < name2) {
          answer = -1;
        }
        return answer;
      }

      function showTermDetails(term) {
        if (term == null) {
          $("#dLabel").text("");
          $("#dAnnotations").html("");
          $("#dKids").html("");
          $("#dParents").html("");
          return;
        }
        if (term.label["undefined"])
          $("#dLabel").text(term.label["undefined"]);
        else if (term.label["IRI-based"])
          $("#dLabel").text(term.label["IRI-based"]);
        let anos = "";
        if (term.annotations)
          for (const [key, value] of Object.entries(term.annotations)) {
            console.debug(key, value);
            anos += "<div><span class='fieldLabel annotations'>" + key + ":</span> <span>" + value[0].value + " </div>";
          }
        $("#dAnnotations").html(anos);

        let subs = "<ul>";
        let children = []
        children.push(term)
        if (term.subClasses) {
          for (let i = 0; i < term.subClasses.length; i++) {
            let extraClass = "";
            if (i % 2 === 0)
              extraClass = "shaded";
            let cid = term.subClasses[i];
            cterm = vowlHelper.getTermById(cid);
            children.push(cterm)
            label = cterm.label["undefined"];
            subs += "<li class='pointer " + extraClass + "' onclick='showTermDetailsById(" + cid + "," + term.id + ")'>"
                    + label + "</li>";
          }
        }
        subs += "</ul>";
        $("#dKids").html(subs);

        let parents = "<ul>";
        if (term.superClasses)
          $("#dParents").html(buildInheritanceNavList(term.superClasses));
        else
          $("#dParents").html("<ul><li>None</li></ul>");
        return children

      }
      function buildInheritanceNavList(items) {
        let count = 0;
        let html = "<ul>";
        var extraclass = "";
        if (items) {
          for (let i = 0; i < items.length; i++) {
            let cid = items[i];
            if (count % 2 === 0)
              extraClass = "shaded";
            else
              extraClass = "";

            let cterm = vowlHelper.getTermById(cid);
            let label = "";

            if (cterm.label["undefined"])
              label = cterm.label["undefined"];
            else if (cterm.label["IRI-based"])
              label = cterm.label["IRI-based"];
            html += "<li class='pointer " + extraClass + "' onclick='showTermDetailsById(" + cid + "," + cterm.id + ")'>"
                    + label + "</li>";
          }
        }
        html += "</ul>";
        return html;
      }

      function showTermDetailsById(id) {
        let term = vowlHelper.getTermById(id);
        return showTermDetails(term);
      }

}
sparkle_builder.buildAccordionPanel = function () {
    sparkle_builder.$title = leaflet_layer_control.buildAccordionPanel(sparkle_builder.$accordion, sparkle_builder.plugin_title);

    var nouns = ['Chinese', 'Airplane', 'Freighter', 'Fighter', 'Length', 'Air Battery', 'Shenyang J-11', 'Width', "Jet"]
    if (vocabulary.length > 0) {
        nouns = vocabulary.map((term_obj) => term_obj.name)
    }


    //Build Content Holder
    sparkle_builder.$content = $('<div class="container" >' +
        '<h5 class="card-title">Search</h5> \
          <div class="row"> \
            <div class ="col-xs-1">\
            <select id="searchType"> \
                <option value="byLabel">By Name</option> \
                <option value="byLabelAndAnnos">Full </option> \
              </select></div> \
              <div class="col-xs-2"> \
              <input type="text" class="form-control form-control-sm typeahead" id="onto_search"/> \
              </div> \
          </div> \
          <div class="row"> \
          <h5>Results</h5> \
          <div class="col"> \
            <div id="resultHolder"> \
            </div> \
          </div> \
          </div> \
          <div class="row"> \
            <h5>Details</h5> \
            <div class="col-12"> \
                <div> \
                    <span class="fieldLabel">Label: </span><span id="dLabel"></span> \
                </div> \
                Annotations: \
                <div id="dAnnotations"> \
                </div> \
                Children: \
                <div id="dKids"> \
                </div> \
                Parents: \
                <div id="dParents"></div> \
            </div> \
        </div> \
    </div>').appendTo(sparkle_builder.$title);

    //Pray
    sparkle_builder.loadOntoSearch()

};

geoq.sparkle_builder = sparkle_builder;
