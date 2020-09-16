
/* global vontology */

const vowlHelper = (function () {
  let ontology = vontology;
  return {
    setVowlOntology: function (newOntology) {
      ontology = newOntology;
    },
    byAnnotation: function (target) { // merge byAnnotation and byProperty
      if (target == undefined)
        return [];
      target = target.toLowerCase();
      return ontology.classAttribute.filter(function (entry) {
        if (entry.annotations != undefined) {
          for (let[annoLabel, anno] of Object.entries(entry.annotations)) {
            if (anno[0].value)
              if (anno[0].value.toLowerCase().includes(target))
                return true;
          }
        }
        return false;

      });
    },
    byProperty: function (prop, target) {
      if (target == undefined)
        return [];
      target = target.toLowerCase();
      return ontology.classAttribute.filter(function (entry) {
        if (entry[prop])
          for (let [key, value] of Object.entries(entry[prop])) {
            if (value)
              if (value.toLowerCase().includes(target))
                return true;
          }
      });
    },

    byLabel: function (target) {
      return vowlHelper.byProperty("label", target);
    },
    byLabelAndAnnotation: function (target) {
      let res = vowlHelper.byLabel(target).concat(vowlHelper.byAnnotation(target));
      let nodupes = res.filter((item, index) => res.indexOf(item) === index);
      return nodupes;
    },

    getLabels: function (includeAnnotations = false) {
      let labels = [];
      ontology.classAttribute.forEach(function (term) {
        if (term.label)
          if (term.label["undefined"])
            labels[labels.length] = term.label["undefined"];
          else if (term.label["IRI-based"])
            labels[labels.length] = term.label["IRI-based"];

      });
      return labels;
    },
    getTermById: function(id) {
      let term = ontology.classAttribute.find(term => term.id == id)
      return term;
    }
  };

})();
let vh = vowlHelper;