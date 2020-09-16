/*
* jQuery SimpleTree Drag&Drop plugin
* Update on 22th May 2008
* Version 0.3
*
* Licensed under BSD <http://en.wikipedia.org/wiki/BSD_License>
* Copyright (c) 2008, Peter Panov <panov@elcat.kg>, IKEEN Group http://www.ikeen.com
* All rights reserved.
*
* Redistribution and use in source and binary forms, with or without
* modification, are permitted provided that the following conditions are met:
*     * Redistributions of source code must retain the above copyright
*       notice, this list of conditions and the following disclaimer.
*     * Redistributions in binary form must reproduce the above copyright
*       notice, this list of conditions and the following disclaimer in the
*       documentation and/or other materials provided with the distribution.
*     * Neither the name of the Peter Panov, IKEEN Group nor the
*       names of its contributors may be used to endorse or promote products
*       derived from this software without specific prior written permission.
*
* THIS SOFTWARE IS PROVIDED BY Peter Panov, IKEEN Group ``AS IS'' AND ANY
* EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
* WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
* DISCLAIMED. IN NO EVENT SHALL Peter Panov, IKEEN Group BE LIABLE FOR ANY
* DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
* (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
* LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
* ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
* (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
* SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

(function($) {
    var NCBOTree = function(element, opt) {
      var _this = this;
      var OPTIONS;
      var ROOT_ID = "roots";
      var mousePressed = false;
      var $TREE_CONTAINER;
      var TREE;
      var ROOT;
      var startingRoot;
  
      OPTIONS = {
        autoclose:         false,
        beforeExpand:      false,
        afterExpand:       false,
        afterExpandError:  false,
        afterSelect:       false,
        afterJumpToClass:  false,
        timeout:           999999,
        treeClass:         "ncboTree",
        autocompleteClass: "ncboAutocomplete",
        width:             350,
        ncboAPIURL:        "http://data.bioontology.org",
        ncboUIURL:         "http://bioportal.bioontology.org",
        apikey:            null,
        ontology:          null,
        startingClass:     null,
        startingRoot:      ROOT_ID,
        defaultRoot:       ROOT_ID
      };
  
      OPTIONS = $.extend(OPTIONS, opt);
  
      // Required options
      if (OPTIONS.apikey == null)
        throw new Error("You must provide an API Key for NCBO Tree Widget to operate");
  
      if (OPTIONS.ontology == null)
        throw new Error("You must provide an ontology id for NCBO Tree Widget to operate");
  
      this.options = function() {
        return OPTIONS;
      }
  
      this.jumpToClass = function(cls, callback) {
        ROOT.html($("<span>").html("Loading...").css("font-size", "smaller"));
        $.ajax({
          url: determineHTTPS(OPTIONS.ncboAPIURL) + "/ontologies/" + OPTIONS.ontology + "/classes/" + encodeURIComponent(cls) + "/tree",
          data: {apikey: OPTIONS.apikey, display: "prefLabel,hasChildren", no_context: true},
          contentType: 'json',
          crossDomain: true,
          success: function(roots) {
            roots = findRootNode(roots);
            ROOT.html(formatNodes(roots));
            setTreeNodes(ROOT, false);
  
            if (typeof callback == 'function') {
              callback();
            }
  
            _this.selectClass(cls);
            if (typeof OPTIONS.afterJumpToClass == 'function') {
              OPTIONS.afterJumpToClass(cls);
            }
            $TREE_CONTAINER.trigger("afterJumpToClass", cls);
          }
        });
      }
  
      this.selectClass = function(cls) {
        var foundClass = $(TREE.find("a[data-id='" + encodeURIComponent(cls) + "']"));
        $(TREE.find("a.active")[0]).removeClass("active");
        foundClass.addClass("active");
      }
  
      this.selectedClass = function() {
        var cls = $(TREE.find("a.active")[0]);
        if (cls.length == 0) {
          return null;
        } else {
          return {
            id: decodeURIComponent(cls.data("id")),
            prefLabel: cls.html(),
            URL: cls.attr("href")
          };
        }
      }
  
      this.changeOntology = function(ont) {
        var newTree = $("<ul>").append($("<li>").addClass("root"));
        $TREE_CONTAINER.html("");
        TREE = newTree;
        OPTIONS.ontology = ont;
        _this.init();
      }
  
      // format the nodes to match what simpleTree is expecting
      var formatNodes = function(nodes) {
        var holder = $("<span>");
        var ul = $("<ul>")
  
        // Sort by prefLabel
        nodes.sort(function(a, b) {
          var aName = a.prefLabel.toLowerCase();
          var bName = b.prefLabel.toLowerCase();
          return ((aName < bName) ? -1 : ((aName > bName) ? 1 : 0));
        });
  
        $.each(nodes, function(index, node) {
          var li = $("<li>");
          var a = $("<a>").attr("href", determineHTTPS(node.links.self)).html(node.prefLabel);
          a.attr("data-id", encodeURIComponent(node["@id"]));
  
          ul.append(li.append(a));
  
          var hasChildrenNotExpanded = typeof node.children !== 'undefined' && node.hasChildren && node.children.length == 0;
          if (node.hasChildren && typeof node.children === 'undefined' || hasChildrenNotExpanded) {
            var ajax_ul = $("<ul>").addClass("ajax");
            var ajax_li = $("<li>");
            var ajax_a = $("<a>").attr("href", node.links.children);
            li.append(ajax_ul.append(ajax_li.append(ajax_a)));
          } else if (typeof node.children !== 'undefined' && node.children.length > 0) {
            var child_ul = formatNodes(node.children);
            li.attr("class", "folder-open")
            li.append(child_ul);
          }
        });
  
        holder.append(ul)
        return holder.html();
      }
  
      var findRootNode = function(nodes) {
        var startingRoot = (OPTIONS.startingRoot == OPTIONS.defaultRoot) ? null : OPTIONS.startingRoot;
        if (startingRoot == null) {return nodes;}
  
        var foundNode = false;
        var searchQueue = nodes;
  
        while (searchQueue.length > 0 || foundNode == false) {
          var node = searchQueue.shift();
          if (node["@id"] == startingRoot) {
            foundNode = [node];
          } else if (typeof node.children !== 'undefined' && node.children.length > 0) {
            searchQueue = searchQueue.concat(node.children);
          }
        }
  
        return foundNode;
      }
  
      var closeNearby = function(obj) {
        $(obj).siblings().filter('.folder-open, .folder-open-last').each(function() {
          var childUl = $('>ul',this);
          var className = this.className;
          this.className = className.replace('open', 'close');
          childUl.hide();
        });
      };
  
      var nodeToggle = function(obj) {
        var childUl = $('>ul',obj);
        if (childUl.is(':visible')) {
          obj.className = obj.className.replace('open','close');
          childUl.hide();
        } else {
          obj.className = obj.className.replace('close','open');
          childUl.show();
          if (OPTIONS.autoclose)
            closeNearby(obj);
          if (childUl.is('.ajax'))
            setAjaxNodes(childUl, obj.id);
        }
      };
  
      var setAjaxNodes = function(node, parentId, successCallback, errorCallback) {
        if (typeof OPTIONS.beforeExpand == 'function') {
          OPTIONS.beforeExpand(node);
        }
        $TREE_CONTAINER.trigger("beforeExpand", node);
  
        var url = determineHTTPS($.trim($('a', node).attr("href")));
        if (url) {
          $.ajax({
            type: "GET",
            url: url,
            data: {apikey: OPTIONS.apikey, display: "prefLabel,hasChildren", no_context: true},
            crossDomain: true,
            contentType: 'json',
            timeout: OPTIONS.timeout,
            success: function(response) {
              var nodes = formatNodes(response.collection)
              node.removeAttr('class');
              node.html(nodes);
              $.extend(node, {url:url});
              setTreeNodes(node, true);
              if (typeof OPTIONS.afterExpand == 'function') {
                OPTIONS.afterExpand(node);
              }
              $TREE_CONTAINER.trigger("afterExpand", node);
              if (typeof successCallback == 'function') {
                successCallback(node);
              }
            },
            error: function(response) {
              if (typeof OPTIONS.afterExpandError == 'function') {
                OPTIONS.afterExpandError(node);
              }
              if (typeof errorCallback == 'function') {
                errorCallback(node);
              }
              $TREE_CONTAINER.trigger("afterExpandError", node);
            }
          });
        }
      };
  
      var setTreeNodes = function(obj, useParent) {
        obj = useParent ? obj.parent() : obj;
        $('li>a', obj).addClass('text').bind('selectstart', function() {
          return false;
        }).click(function() {
          var parent = $(this).parent();
          var selectedNode = $(this);
          $('.active', TREE).attr('class', 'text');
          if (this.className == 'text') {
            this.className = 'active';
          }
          if (typeof OPTIONS.afterSelect == 'function') {
            OPTIONS.afterSelect(decodeURIComponent(selectedNode.data("id")), selectedNode.text(), selectedNode);
          }
          $TREE_CONTAINER.trigger("afterSelect", [decodeURIComponent(selectedNode.data("id")), selectedNode.text(), selectedNode]);
          return false;
        }).bind("contextmenu",function() {
          $('.active', TREE).attr('class', 'text');
          if (this.className == 'text') {
            this.className = 'active';
          }
          if (typeof OPTIONS.afterContextMenu == 'function') {
            OPTIONS.afterContextMenu(parent);
          }
          return false;
        }).mousedown(function(event) {
          mousePressed = true;
          cloneNode = $(this).parent().clone();
          var LI = $(this).parent();
          return false;
        });
  
        $('li', obj).each(function(i) {
          var className = this.className;
          var open = false;
          var cloneNode=false;
          var LI = this;
          var childNode = $('>ul',this);
          if (childNode.length > 0) {
            var setClassName = 'folder-';
            if (className && className.indexOf('open') >= 0) {
              setClassName = setClassName + 'open';
              open = true;
            } else {
              setClassName = setClassName+'close';
            }
            this.className = setClassName + ($(this).is(':last-child') ? '-last' : '');
  
            if (!open || className.indexOf('ajax') >= 0)
              childNode.hide();
  
            setTrigger(this);
          } else {
            var setClassName = 'doc';
            this.className = setClassName + ($(this).is(':last-child') ? '-last' : '');
          }
        }).before('<li class="line">&nbsp;</li>')
          .filter(':last-child')
          .after('<li class="line-last"></li>');
      };
  
      var setTrigger = function(node) {
        $('>a',node).before('<img class="trigger" src="data:image/gif;base64,R0lGODlhAQABAID/AMDAwAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" border=0>');
        var trigger = $('>.trigger', node);
        trigger.click(function(event) {
          nodeToggle(node);
        });
        // TODO: $.browser was removed in jQuery 1.9, check IE compatability
        // if (!$.browser.msie) {
        //   trigger.css('float','left');
        // }
      };
  
      var determineHTTPS = function(url) {
        return url.replace("http:", ('https:' == document.location.protocol ? 'https:' : 'http:'));
      }
  
      var initAutocomplete = function() {
        // Add the autocomplete
        var autocompleteContainer = $("<div>").addClass(OPTIONS.autocompleteClass).addClass("ncboTree");
        var input = $("<input>")
          .addClass(OPTIONS.autocompleteClass)
          .css("width", OPTIONS.width)
          .attr("placeholder", "Search for class...");
        autocompleteContainer.append(input);
        input.NCBOAutocomplete({
          url: OPTIONS.ncboAPIURL + "/search",
          searchParameter: "q",
          resultAttribute: "collection",
          property: "prefLabel",
          searchTextSuffix: "*",
          searchFromRoot: startingRoot,
          onSelect: function(item, searchInput) {
            _this.jumpToClass(item["@id"]);
            searchInput.val("");
          },
          minCharacters: 3,
          additionalParameters: {
            apikey: OPTIONS.apikey,
            no_context: true,
            ontologies: OPTIONS.ontology
          }
        });
        $TREE_CONTAINER.append(autocompleteContainer);
      }
  
      // Populate roots and init tree
      this.init = function() {
        $TREE_CONTAINER = element;
        TREE = $("<ul>").append($("<li>").addClass("root"));
        ROOT = $('.root', TREE);
        TREE.css("width", OPTIONS.width).addClass(OPTIONS.treeClass);
        $TREE_CONTAINER.html("");
  
        // Only set starting root when something other than roots is selected
        startingRoot = (OPTIONS.startingRoot == OPTIONS.defaultRoot) ? null : OPTIONS.startingRoot;
  
        initAutocomplete();
        $TREE_CONTAINER.append(TREE);
  
        if (OPTIONS.startingClass !== null) {
          _this.jumpToClass(OPTIONS.startingClass);
          OPTIONS.startingClass = null;
        } else {
          ROOT.html($("<span>").html("Loading...").css("font-size", "smaller"));
          $.ajax({
            url: determineHTTPS(OPTIONS.ncboAPIURL) + "/ontologies/" + OPTIONS.ontology + "/classes/" + encodeURIComponent(OPTIONS.startingRoot),
            data: {apikey: OPTIONS.apikey, display: "prefLabel,hasChildren", no_context: true},
            contentType: 'json',
            crossDomain: true,
            success: function(roots) {
              // Flatten potentially nested arrays
              roots = $.map([roots], function(n) {
                return n;
              });
              ROOT.html(formatNodes(roots));
              setTreeNodes(ROOT, false);
            }
          });
        }
      };
    }
  
    // Returns the original object(s) so they can be chained
    $.fn.NCBOTree = function(options) {
      return this.each(function() {
        var $this = $(this);
  
        // Return early if this element already has a plugin instance
        if ($this.data('NCBOTree')) return;
  
        // pass options to plugin constructor
        var ncboTree = new NCBOTree($this, options);
        this.NCBOTree = ncboTree;
  
        // Add the autocomplete code
        $.ajax({
          url: ncboTree.options().ncboUIURL.replace("http:", ('https:' == document.location.protocol ? 'https:' : 'http:')) + "/widgets/jquery.ncbo.autocomplete.js",
          type: "GET",
          crossDomain: true,
          dataType: "script",
          success: function() {
            ncboTree.init();
  
            // Store plugin object in this element's data
            $this.data('NCBOTree', ncboTree);
          }
        });
      });
    }
  
  }(jQuery));