/*
 * Summer html image map creator
 * http://github.com/summerstyle/summer
 *
 * Copyright 2016 Vera Lobacheva (http://iamvera.com)
 * Released under the MIT license
 */

var summerHtmlImageMapCreator = (function() {
    'use strict';
    
    /* Utilities */
    var utils = {
        /**
         * Returns offset from html page top-left corner for some element
         *
         * @param node {HTMLElement} - html element
         * @returns {Object} - object with offsets, e.g. {x: 100, y: 200}
         */
        getOffset : function(node) {
            var boxCoords = node.getBoundingClientRect();
        
            return {
                x : Math.round(boxCoords.left + window.pageXOffset),
                y : Math.round(boxCoords.top + window.pageYOffset)
            };
        },
        
        /**
         * Returns correct coordinates (incl. offsets)
         *
         * @param x {number} - x-coordinate
         * @param y {number} - y-coordinate
         * @returns {Object} - object with recalculated coordinates, e.g. {x: 100, y: 200}
         */ 
        getRightCoords : function(x, y) {
            return {
                x : x - app.getOffset('x'),
                y : y - app.getOffset('y')
            };
        },
        
        /**
         * TODO: will use same method of app.js
         * @deprecated
         */
        id : function (str) {
            return document.getElementById(str);
        },
        
        /**
         * TODO: will use same method of app.js
         * @deprecated
         */
        hide : function(node) {
            node.style.display = 'none';
            
            return this;
        },
        
        /**
         * TODO: will use same method of app.js
         * @deprecated
         */
        show : function(node) {
            node.style.display = 'block';
            
            return this;
        },
        
        /**
         * Escape < and > (for code output)
         *
         * @param str {string} - a string with < and >
         * @returns {string} - a string with escaped < and >
         */
        encode : function(str) {
            return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        },
        
        /**
         * TODO: will use same method of app.js
         * @deprecated
         */
        foreach : function(arr, func) {
            for(var i = 0, count = arr.length; i < count; i++) {
                func(arr[i], i);
            }
        },
        
        /**
         * TODO: will use same method of app.js
         * @deprecated
         */
        foreachReverse : function(arr, func) {
            for(var i = arr.length - 1; i >= 0; i--) {
                func(arr[i], i);
            }
        },
        
        /**
         * Display debug info to some block
         */
        debug : (function() {
            var output = document.getElementById('debug');
            
            return function() {
                output.innerHTML = [].join.call(arguments, ' ');
            };
        })(),
        
        /**
         * TODO: will use same method of app.js
         * @deprecated
         */
        stopEvent : function(e) {
            e.stopPropagation();
            e.preventDefault();
            
            return this;
        },
        
        /**
         * TODO: will use same method of app.js
         * @deprecated
         */
        extend : function(obj, options) {
            var target = {};

            for (var name in obj) {
                if(obj.hasOwnProperty(name)) {
                    target[name] = options[name] ? options[name] : obj[name];
                }
            }

            return target;
        },
        
        inherits : (function() {
            var F = function() {};
            
            return function(Child, Parent) {
                F.prototype = Parent.prototype;
                Child.prototype = new F();
                Child.prototype.constructor = Child;
            };
        })()
    };


    /* Main module - will be main module in app.js-based application */
    var app = (function() {
        var domElements = {
                wrapper : utils.id('wrapper'),
                svg : utils.id('svg'),
                img : utils.id('img'),
                container : utils.id('image'),
                map : null
            },
            state = {
                offset : {
                    x : 0,
                    y : 0
                },
                appMode : null, // drawing || editing || preview
                currentType : null,
                editType : null,
                newArea : null,
                selectedArea : null,
                areas : [],
                events : [],
                isDraw : false,
                image : {
                    src : null,
                    filename : null,
                    width: 0,
                    height: 0
                }
            },
            KEYS = {
                F1     : 112,
                ESC    : 27,
                TOP    : 38,
                BOTTOM : 40,
                LEFT   : 37,
                RIGHT  : 39,
                DELETE : 46,
                I      : 73,
                S      : 83,
                C      : 67
            };

        function recalcOffsetValues() {
            state.offset = utils.getOffset(domElements.container);
        }

        /* Get offset value */
        window.addEventListener('resize', recalcOffsetValues, false);

        /* Disable selection */
        domElements.container.addEventListener('mousedown', function(e) { e.preventDefault(); }, false);

        /* Disable image dragging */
        domElements.img.addEventListener('dragstart', function(e){
            e.preventDefault();
        }, false);

        /* Display cursor coordinates info */
        var cursor_position_info = (function() {
            var coords_info = utils.id('coords');
            
            return {
                set : function(coords) {
                    coords_info.innerHTML = 'x: ' + coords.x + ', ' + 'y: ' + coords.y;
                },
                empty : function() {
                    coords_info.innerHTML = '';
                }
            };
        })();
        
        domElements.container.addEventListener('mousemove', function(e){
            cursor_position_info.set(utils.getRightCoords(e.pageX, e.pageY));
        }, false);

        domElements.container.addEventListener('mouseleave', function(){
            cursor_position_info.empty();
        }, false);

        /* Add mousedown event for svg */
        function onSvgMousedown(e) {
            if (state.appMode === 'editing') {
                if (e.target.parentNode.tagName === 'g') {
                    info.unload();
                    state.selectedArea = e.target.parentNode.obj;
                    
                    app.deselectAll();
                    state.selectedArea.select();
                    state.selectedArea.editingStartPoint = {
                        x : e.pageX,
                        y : e.pageY
                    };
    
                    if (e.target.classList.contains('helper')) {
                        var helper = e.target;
                        state.editType = helper.action;
    
                        if (helper.n >= 0) { // if typeof selected_area == polygon
                            state.selectedArea.selected_point = helper.n;
                        }
                        
                        app.addEvent(app.domElements.container,
                                     'mousemove',
                                     state.selectedArea.onProcessEditing.bind(state.selectedArea))
                           .addEvent(app.domElements.container,
                                     'mouseup',
                                     state.selectedArea.onStopEditing.bind(state.selectedArea));
                    } else if (e.target.tagName === 'rect' || e.target.tagName === 'circle' || e.target.tagName === 'polygon') {
                        state.editType = 'move';
                        
                        app.addEvent(app.domElements.container,
                                     'mousemove',
                                     state.selectedArea.onProcessEditing.bind(state.selectedArea))
                           .addEvent(app.domElements.container,
                                     'mouseup',
                                     state.selectedArea.onStopEditing.bind(state.selectedArea));
                    }
                } else {
                    app.deselectAll();
                    info.unload();
                }
            }
        }
        
        domElements.container.addEventListener('mousedown', onSvgMousedown, false);
        
        /* Add click event for svg */
        function onSvgClick(e) {
            if (state.appMode === 'drawing' && !state.isDraw && state.currentType) {
                code.hide();
                app.setIsDraw(true);
                
                state.newArea = Area.CONSTRUCTORS[state.currentType].createAndStartDrawing(
                    utils.getRightCoords(e.pageX, e.pageY)
                );
            }
        }
    
        domElements.container.addEventListener('click', onSvgClick, false);
        
        /* Add dblclick event for svg */
        function onAreaDblClick(e) {
            if (state.appMode === 'editing') {
                if (e.target.tagName === 'rect' || e.target.tagName === 'circle' || e.target.tagName === 'polygon') {
                    state.selectedArea = e.target.parentNode.obj;
                    info.load(state.selectedArea, e.pageX, e.pageY);
                }
            }
        }
        
        domElements.container.addEventListener('dblclick', onAreaDblClick, false);
        
         
        /* Add keydown event for document */
        function onDocumentKeyDown(e) {
            var ctrlDown = e.ctrlKey || e.metaKey; // PC || Mac
            
            switch (e.keyCode) {
                case KEYS.F1:
                    help.show();
                    e.preventDefault();
                    
                    break;
                
                case KEYS.ESC:
                    help.hide();
                    if (state.isDraw) {
                        state.isDraw = false;
                        state.newArea.remove();
                        state.areas.pop();
                        app.removeAllEvents();
                    } else if (state.appMode === 'editing') {
                        state.selectedArea.redraw();
                        app.removeAllEvents();
                    }
                    
                    break;
                
                case KEYS.TOP:
                    if (state.appMode === 'editing' && state.selectedArea) {
                        state.selectedArea.move(0, -1);
                        e.preventDefault();
                    }
                    
                    break;
                
                case KEYS.BOTTOM:
                    if (state.appMode === 'editing' && state.selectedArea) {
                        state.selectedArea.move(0, 1);
                        e.preventDefault();
                    }
                    break;
                
                case KEYS.LEFT: 
                    if (state.appMode === 'editing' && state.selectedArea) {
                        state.selectedArea.move(-1, 0);
                        e.preventDefault();
                    }
                    
                    break;
                
                case KEYS.RIGHT:
                    if (state.appMode === 'editing' && state.selectedArea) {
                        state.selectedArea.move(1, 0);
                        e.preventDefault();
                    }
                    
                    break;
                
                case KEYS.DELETE:
                    if (state.appMode === 'editing' && state.selectedArea) {
                        app.removeObject(state.selectedArea);
                        state.selectedArea = null;
                        info.unload();
                    }
                    
                    break;
                
                case KEYS.I:
                    if (state.appMode === 'editing' && state.selectedArea) {
                        var coordsForAttributesForm = state.selectedArea.getCoordsForDisplayingInfo();
                            
                        info.load(
                            state.selectedArea, 
                            coordsForAttributesForm.x + app.getOffset('x'), 
                            coordsForAttributesForm.y + app.getOffset('y')
                        );
                    }
                    
                    break;
                
                case KEYS.S:
                    if (ctrlDown) {
                        app.saveInLocalStorage();
                    }
    
                    break;
                
                case KEYS.C:
                    if (state.appMode === 'editing' && state.selectedArea && ctrlDown) {
                        state.selectedArea = Area.copy(state.selectedArea);
                    }
                
                    break;
            }
        }
        
        document.addEventListener('keydown', onDocumentKeyDown, false);
        
        // Will moved from the main module
        var areasIO = {
            toJSON : function() {
                var obj = {
                    areas : [],
                    img : state.image.src
                };
    
                utils.foreach(state.areas, function(x) {
                    obj.areas.push(x.toJSON());
                });
                
                return JSON.stringify(obj);
            },
            fromJSON : function(str) {
                var obj = JSON.parse(str);
                
                app.loadImage(obj.img);
                
                utils.foreach(obj.areas, function(areaParams) {
                    Area.fromJSON(areaParams);
                });    
            }
        };
        
        // Will moved from the main module
        var localStorageWrapper = (function() {
            var KEY_NAME = 'SummerHTMLImageMapCreator';
            
            return {
                save : function() {
                    var result = areasIO.toJSON();
                    window.localStorage.setItem(KEY_NAME, result);
                    console.info('Editor ' + result + ' saved');
                
                    alert('Saved');
                },
                restore : function() {
                    areasIO.fromJSON(window.localStorage.getItem(KEY_NAME));
                }
            };
        })();
        
        return {
            domElements : domElements,
            saveInLocalStorage : localStorageWrapper.save,
            loadFromLocalStorage : localStorageWrapper.restore,
            hide : function() {
                utils.hide(domElements.container);
                return this;
            },
            show : function() {
                utils.show(domElements.container);
                return this;
            },
            recalcOffsetValues: function() {
                recalcOffsetValues();
                return this;
            },
            setDimensions : function(width, height) {
                domElements.svg.setAttribute('width', width);
                domElements.svg.setAttribute('height', height);
                domElements.container.style.width = width + 'px';
                domElements.container.style.height = height + 'px';
                return this;
            },
            loadImage : function(url) {
                get_image.showLoadIndicator();
                domElements.img.src = url;
                state.image.src = url;
                
                domElements.img.onload = function() {
                    get_image.hideLoadIndicator().hide();
                    app.show()
                       .setDimensions(domElements.img.width, domElements.img.height)
                       .recalcOffsetValues();
                };
                return this;
            },
            preview : (function() {
                domElements.img.setAttribute('usemap', '#map');
                domElements.map = document.createElement('map');
                domElements.map.setAttribute('name', 'map');
                domElements.container.appendChild(domElements.map);
                
                return function() {
                    info.unload();
                    app.setShape(null);
                    utils.hide(domElements.svg);
                    domElements.map.innerHTML = app.getHTMLCode();
                    code.print();
                    return this;
                };
            })(),
            hidePreview : function() {
                utils.show(domElements.svg);
                domElements.map.innerHTML = '';
                return this;
            },
            addNodeToSvg : function(node) {
                domElements.svg.appendChild(node);
                return this;
            },
            removeNodeFromSvg : function(node) {
                domElements.svg.removeChild(node);
                return this;
            },
            getOffset : function(arg) {
                switch(arg) {
                    case 'x':
                    case 'y':
                        return state.offset[arg];
                }
            },
            clear : function(){
                //remove all areas
                state.areas.length = 0;
                while(domElements.svg.childNodes[0]) {
                    domElements.svg.removeChild(domElements.svg.childNodes[0]);
                }
                code.hide();
                info.unload();
                return this;
            },
            removeObject : function(obj) {
                utils.foreach(state.areas, function(x, i) {
                    if(x === obj) {
                        state.areas.splice(i, 1);
                    }
                });
                obj.remove();
                return this;
            },
            deselectAll : function() {
                utils.foreach(state.areas, function(x) {
                    x.deselect();
                });
                return this;
            },
            getIsDraw : function() {
                return state.isDraw;
            },
            setIsDraw : function(arg) {
                state.isDraw = arg;
                return this;
            },
            setMode : function(arg) {
                state.appMode = arg;
                return this;
            },
            getMode : function() {
                return state.appMode;
            },
            setShape : function(arg) {
                state.currentType = arg;
                return this;
            },
            getShape : function() {
                return state.currentType;
            },
            addObject : function(object) {
                state.areas.push(object);
                return this;
            },
            getNewArea : function() {
                return state.newArea;
            },
            resetNewArea : function() {
                state.newArea = null;
                return this;
            },
            getSelectedArea : function() {
                return state.selectedArea;
            },
            setSelectedArea : function(obj) {
                state.selectedArea = obj;
                return this;
            },
            getEditType : function() {
                return state.editType;
            },
            setFilename : function(str) {
                state.image.filename = str;
                return this;
            },
            setEditClass : function() {
                domElements.container.classList.remove('draw');
                domElements.container.classList.add('edit');

                return this;
            },
            setDrawClass : function() {
                domElements.container.classList.remove('edit');
                domElements.container.classList.add('draw');

                return this;
            },
            setDefaultClass : function() {
                domElements.container.classList.remove('edit');
                domElements.container.classList.remove('draw');

                return this;
            },
            addEvent : function(target, eventType, func) {
                state.events.push(new AppEvent(target, eventType, func));
                return this;
            },
            removeAllEvents : function() {
                utils.foreach(state.events, function(x) {
                    x.remove();
                });
                state.events.length = 0;
                return this;
            },
            getHTMLCode : function(arg) {
                var html_code = '';
                if (arg) {
                    if (!state.areas.length) {
                        return '0 objects';
                    }
                    html_code += utils.encode('<img src="' + state.image.filename + '" alt="" usemap="#map" />') +
                        '<br />' + utils.encode('<map name="map">') + '<br />';
                    utils.foreachReverse(state.areas, function(x) {
                        html_code += '&nbsp;&nbsp;&nbsp;&nbsp;' + utils.encode(x.toHTMLMapElementString()) + '<br />';
                    });
                    html_code += utils.encode('</map>');
                } else {
                    utils.foreachReverse(state.areas, function(x) {
                        html_code += x.toHTMLMapElementString();
                    });
                }
                return html_code;
            }
        };
    })();
    
    
    /**
     * The constructor for dom events (for simple deleting of event)
     * 
     * @constructor
     * @param {DOMElement} target - DOM-element
     * @param {String} eventType - e.g. 'click' or 'mousemove'
     * @param {Function} func - handler for this event
     */
    function AppEvent(target, eventType, func) {
        this.target = target;
        this.eventType = eventType;
        this.func = func;
        
        target.addEventListener(eventType, func, false);
    }
    
    /**
     * Remove this event listener from target
     */
    AppEvent.prototype.remove = function() {
        this.target.removeEventListener(this.eventType, this.func, false);
    };


    /**
     * The constructor of helpers points
     * Helper is small svg-rectangle with some actions
     * 
     * @constructor
     * @param node {DOMElement} - a node for inserting helper
     * @param x {number} - x-coordinate of helper
     * @param y {number} - y-coordinate of helper
     * @param action {string} - an action by click of this helper (e.g. 'move')
     */
    function Helper(node, x, y, action) {
        this._el = document.createElementNS(Area.SVG_NS, 'rect');
        
        this._el.classList.add(Helper.CLASS_NAME);
        this._el.setAttribute('height', Helper.SIZE);
        this._el.setAttribute('width', Helper.SIZE);
        this._el.setAttribute('x', x + Helper.OFFSET);
        this._el.setAttribute('y', y + Helper.OFFSET);
        
        node.appendChild(this._el);
        
        this._el.action = action; // TODO: move 'action' from dom el to data-attr
        this._el.classList.add(Helper.ACTIONS_TO_CURSORS[action]);
    }
    
    Helper.SIZE = 5;
    Helper.OFFSET = -Math.ceil(Helper.SIZE / 2);
    Helper.CLASS_NAME = 'helper';
    Helper.ACTIONS_TO_CURSORS = {
        'move'            : 'move',
        'editLeft'        : 'e-resize',
        'editRight'       : 'w-resize',
        'editTop'         : 'n-resize',
        'editBottom'      : 's-resize',
        'editTopLeft'     : 'nw-resize',
        'editTopRight'    : 'ne-resize',
        'editBottomLeft'  : 'sw-resize',
        'editBottomRight' : 'se-resize',
        'movePoint'       : 'pointer'
    };

    /**
     * Set coordinates for this helper
     * 
     * @param x {number} - x-coordinate
     * @param y {number} - y-coordinate
     * @returns {Helper}
     */
    Helper.prototype.setCoords = function(x, y) {
        this._el.setAttribute('x', x + Helper.OFFSET);
        this._el.setAttribute('y', y + Helper.OFFSET);
        
        return this;
    };
    
    /**
     * Set id of this helper in list of parent's helpers
     * 
     * @param id {number} 
     * @returns {Helper}
     */
    Helper.prototype.setId = function(id) {
        // TODO: move n-field from DOM-element to data-attribute
        this._el.n = id;
        
        return this;
    };
    
    /**
     * The abstract constructor for area
     *
     * @constructor
     * @abstract
     * @param type {string} - type of area ('rectangle', 'circle' or 'polygon')
     * @param coords {Object} - coordinates of area (e.g. x, y, width, height)
     * @param attributes {Object} [attributes=undefined] - attributes for area (e.g. href, title)
     */
    function Area(type, coords, attributes) {
        if (this.constructor === Area) {
            throw new Error('This is abstract class');
        }
        
        this._type = type;
        
        /**
         * @namespace
         * @property href {string} - href-attribute of area
         * @property alt {string} - alt-attribute of area
         * @property title {string} - title-attribute of area
         */
        this._attributes = {
            href : '',
            alt : '',
            title : ''    
        };

        if (attributes) {
            this.setInfoAttributes(attributes);
        }
        
        this._coords = coords;
        
        // the g-element, it contains this area and helpers elements
        this._groupEl = document.createElementNS(Area.SVG_NS, 'g');
        app.addNodeToSvg(this._groupEl);
        
        // TODO: remove this field from DOM-element
        // Link to parent object
        this._groupEl.obj = this;
        
        // svg-dom-element of area
        this._el = null; 
        
        // Object with all helpers of area
        this._helpers = {};
        
        // Add this new area to list of all areas 
        app.addObject(this);
    }
    Area.SVG_NS = 'http://www.w3.org/2000/svg'; // TODO: move to main editor constructor
    Area.CLASS_NAMES = {
        SELECTED : 'selected',
        WITH_HREF : 'with_href'
    };
    Area.CONSTRUCTORS = {
        rectangle : Rectangle,
        circle : Circle,
        polygon : Polygon
    };
    Area.REGEXP = {
        AREA : /<area(?=.*? shape="(rect|circle|poly)")(?=.*? coords="([\d ,]+?)")[\s\S]*?>/gmi,
        HREF : / href="([\S\s]+?)"/,
        ALT : / alt="([\S\s]+?)"/,
        TITLE : / title="([\S\s]+?)"/,
        DELIMETER : / ?, ?/
    };
    Area.HTML_NAMES_TO_AREA_NAMES = {
        rect : 'rectangle',
        circle : 'circle',
        poly : 'polygon'
    };
    Area.ATTRIBUTES_NAMES = ['HREF', 'ALT', 'TITLE'];
    
    /**
     * This method should be implemented for child-classes 
     * 
     * @throws {AbstractMethodCall}
     */
    Area.prototype.ABSTRACT_METHOD = function() {
        throw new Error('This is abstract method');
    };
    
    /**
     * All these methods are abstract 
     * 
     * @throws {AbstractMethodCall}
     */
    Area.prototype.setSVGCoords =
    Area.prototype.setCoords = 
    Area.prototype.dynamicDraw = 
    Area.prototype.onProcessDrawing = 
    Area.prototype.onStopDrawing = 
    Area.prototype.edit = 
    Area.prototype.dynamicEdit = 
    Area.prototype.onProcessEditing = 
    Area.prototype.onStopEditing = 
    Area.prototype.toString = 
    Area.prototype.toHTMLMapElementString =
    Area.prototype.getCoordsForDisplayingInfo = 
    Area.prototype.ABSTRACT_METHOD;
    
    /**
     * Redraw this area with own or custom coordinates
     * 
     * @param coords {Object} [coords=undefined]
     * @returns {Area} - this area
     */
    Area.prototype.redraw = function(coords) {
        this.setSVGCoords(coords ? coords : this._coords);
        
        return this;
    };
    
    /**
     * Remove this area from DOM-tree
     */
    Area.prototype.remove = function() {
        app.removeNodeFromSvg(this._groupEl);
    };

    /**
     * Move this area by dx, dy 
     * 
     * @returns {Area} - this area
     */
    Area.prototype.move = function(dx, dy) {
        this.setCoords(this.edit('move', dx, dy)).redraw();
        return this;
    };
    
    /**
     * Add class name for selected areas to this area
     * 
     * @returns {Area} - this area
     */
    Area.prototype.select = function() {
        this._el.classList.add(Area.CLASS_NAMES.SELECTED);
        console.info(this.toString() + ' is selected now');
        
        return this;
    };
    
    /**
     * Remove class name for selected areas from this area
     * 
     * @returns {Area} - this area
     */
    Area.prototype.deselect = function() {
        this._el.classList.remove(Area.CLASS_NAMES.SELECTED);
        
        return this;
    };
    
    /**
     * Set style of element with href attribute for this area
     * 
     * @returns {Area} - this area
     */
    Area.prototype.setStyleOfElementWithHref = function() {
        this._el.classList.add(Area.CLASS_NAMES.WITH_HREF);
        
        return this;
    };
    
    /**
     * Unset style of element with href attribute for this area
     * 
     * @returns {Area} - this area
     */
    Area.prototype.unsetStyleOfElementWithHref = function() {
        this._el.classList.remove(Area.CLASS_NAMES.WITH_HREF);
        
        return this;
    };
    
    /**
     * Set attributes (href, alt and title) for this area
     * 
     * @param attributes {Object} - Object with attributes for area
     */
    Area.prototype.setInfoAttributes = function(attributes) {
        this._attributes.href = attributes.href;
        this._attributes.alt = attributes.alt;
        this._attributes.title = attributes.title;
    };
    
    /**
     * Returns json-representation of this area
     * 
     * @returns {Object}
     */
    Area.prototype.toJSON = function() {
        /**
         * @namespace
         * @property type {string} - type of this area (e.g. 'rectangle', 'circle')
         * @property coords {Object} - coordinates of this area (e.g. 'x', 'width') 
         * @property attributes {Object} - attributes of this area (e.g. 'href', 'title')
         */
        return {
            type : this._type,
            coords : this._coords,
            attributes : this._attributes
        };
    };
    
    /**
     * Returns new area object created with params from json-object
     * 
     * @static
     * @param params {Object} - params of area, incl. type, coords and attributes
     * @returns {Rectangle|Circle|Polygon}
     */
    Area.fromJSON = function(params) {
        var AreaConstructor = Area.CONSTRUCTORS[params.type];
        
        if (!AreaConstructor) {
            throw new Error('This area type is not valid');
        }
        
        if (!AreaConstructor.testCoords(params.coords)) {
            throw new Error('This coords is not valid for ' + params.type);
        }
        
        app.setIsDraw(true);
        
        var area = new AreaConstructor(params.coords, params.attributes);
        
        app.setIsDraw(false)
           .resetNewArea();
        
        return area;
    };

    /**
     * Creates new areas from html-string with <area /> elements
     * 
     * @param htmlStr {string}
     * @returns {Array} - array with areas
     */
    Area.createAreasFromHTMLOfMap = function(htmlStr) {
        if (!htmlStr) {
            return false;
        } 

        while (true) {
            var findedResult = Area.REGEXP.AREA.exec(htmlStr); // <area shape="$1" coords="$2" ... />
            if (!findedResult) {
                break;
            }    

            var htmlAreaFinded = findedResult[0], // <area shape="..." coords="..." ... />
                type = findedResult[1], // $1
                coords = findedResult[2].split(Area.REGEXP.DELIMETER), // $2
                attributes = {}; 
            
            Area.ATTRIBUTES_NAMES.forEach(function(item, i) {
                var result = Area.REGEXP[item].exec(htmlAreaFinded);

                if (result) {
                    attributes[name] = result[1];
                }    
            });
            
            coords = coords.map(function(item) {
                return Number(item);
            });

            type = Area.HTML_NAMES_TO_AREA_NAMES[type];

            Area.fromJSON({
                type : type,
                coords : Area.CONSTRUCTORS[type].getCoordsFromHTMLArray(coords),
                attributes : attributes
            });

        }

        return Boolean(htmlAreaFinded);
    };

    /**
     * Returns copy of original area, selected and moved by (10,10) from it
     * 
     * @param originalArea {Area}
     * @returns {Area} - a copy of original area
     */
    Area.copy = function(originalArea) {
        return Area.fromJSON(originalArea.toJSON()).move(10, 10).select();
    };

    /* ---------- Constructors for real areas ---------- */

    /**
     * The constructor for rectangles
     * 
     * (x, y) -----
     * |          | height
     * ------------
     *     width
     *
     * @constructor
     * @param coords {Object} - object with parameters of new area (x, y, width, height)
     *                          if some parameter is undefined, it will set 0
     * @param attributes {Object} [attributes=undefined] - attributes for area (e.g. href, title) 
     */
    function Rectangle(coords, attributes) {
        Area.call(this, 'rectangle', coords, attributes);
        
        /**
         * @namespace
         * @property {number} x - Distance from the left edge of the image to the left side of the rectangle
         * @property {number} y - Distance from the top edge of the image to the top side of the rectangle
         * @property {number} width - Width of rectangle
         * @property {number} height - Height of rectangle
         */
        this._coords = {
            x : coords.x || 0, 
            y : coords.y || 0,
            width : coords.width || 0, 
            height : coords.height || 0
        };
    
        this._el = document.createElementNS(Area.SVG_NS, 'rect');
        this._groupEl.appendChild(this._el);
        
        var x = coords.x - this._coords.width / 2,
            y = coords.y - this._coords.height / 2;
        
        this._helpers = {
            center : new Helper(this._groupEl, x, y, 'move'),
            top : new Helper(this._groupEl, x, y, 'editTop'),
            bottom : new Helper(this._groupEl, x, y, 'editBottom'),
            left : new Helper(this._groupEl, x, y, 'editLeft'),
            right : new Helper(this._groupEl, x, y, 'editRight'),
            topLeft : new Helper(this._groupEl, x, y, 'editTopLeft'),
            topRight : new Helper(this._groupEl, x, y, 'editTopRight'),
            bottomLeft : new Helper(this._groupEl, x, y, 'editBottomLeft'),
            bottomRight : new Helper(this._groupEl, x, y, 'editBottomRight')
        };
        
        this.redraw();
    }
    utils.inherits(Rectangle, Area);
    
    /**
     * Set attributes for svg-elements of area by new parameters
     * 
     * -----top------
     * |            |
     * ---center_y---
     * |            |
     * ----bottom----
     * 
     * @param coords {Object} - Object with coords of this area (x, y, width, height)
     * @returns {Rectangle} - this rectangle
     */
    Rectangle.prototype.setSVGCoords = function(coords) {
        this._el.setAttribute('x', coords.x);
        this._el.setAttribute('y', coords.y);
        this._el.setAttribute('width', coords.width);
        this._el.setAttribute('height', coords.height);
        
        var top = coords.y,
            center_y = coords.y + coords.height / 2,
            bottom = coords.y + coords.height,
            left = coords.x,
            center_x = coords.x + coords.width / 2,
            right = coords.x + coords.width;
    
        this._helpers.center.setCoords(center_x, center_y);
        this._helpers.top.setCoords(center_x, top);
        this._helpers.bottom.setCoords(center_x, bottom);
        this._helpers.left.setCoords(left, center_y);
        this._helpers.right.setCoords(right, center_y);
        this._helpers.topLeft.setCoords(left, top);
        this._helpers.topRight.setCoords(right, top);
        this._helpers.bottomLeft.setCoords(left, bottom);
        this._helpers.bottomRight.setCoords(right, bottom);
        
        return this;
    };
    
    /**
     * Set coords for this area
     * 
     * @param coords {coords}
     * @returns {Rectangle} - this rectangle
     */
    Rectangle.prototype.setCoords = function(coords) {
        this._coords.x = coords.x;
        this._coords.y = coords.y;
        this._coords.width = coords.width;
        this._coords.height = coords.height;
        
        return this;
    };
    
    /**
     * Calculates new coordinates in process of drawing
     * 
     * @param x {number} - x-coordinate of cursor
     * @param y {number} - y-coordinate of cursor
     * @param isSquare {boolean}
     * @returns {Object} - calculated coords of this area
     */
    Rectangle.prototype.dynamicDraw = function(x, y, isSquare) {
        var newCoords = {
            x : this._coords.x,
            y : this._coords.y,
            width : x - this._coords.x,
            height: y - this._coords.y
        };
        
        if (isSquare) {
            newCoords = Rectangle.getSquareCoords(newCoords);
        }
        
        newCoords = Rectangle.getNormalizedCoords(newCoords);
        
        this.redraw(newCoords);
        
        return newCoords;
    };
    
    /**
     * Handler for drawing process (by mousemove)
     * It includes only redrawing area by new coords 
     * (this coords doesn't save as own area coords)
     * 
     * @params e {MouseEvent} - mousemove event
     */
    Rectangle.prototype.onProcessDrawing = function(e) {
        var coords = utils.getRightCoords(e.pageX, e.pageY);
            
        this.dynamicDraw(coords.x, coords.y, e.shiftKey);
    };
    
    /**
     * Handler for drawing stoping (by second click on drawing canvas)
     * It includes redrawing area by new coords 
     * and saving this coords as own area coords
     * 
     * @params e {MouseEvent} - click event
     */
    Rectangle.prototype.onStopDrawing = function(e) {
        var coords = utils.getRightCoords(e.pageX, e.pageY);
        
        this.setCoords(this.dynamicDraw(coords.x, coords.y, e.shiftKey)).deselect();
        
        app.removeAllEvents()
           .setIsDraw(false)
           .resetNewArea();
    };
    
    /**
     * Changes area parameters by editing type and offsets
     * 
     * @param {string} editingType - A type of editing (e.g. 'move')
     * @returns {Object} - Object with changed parameters of area 
     */
    Rectangle.prototype.edit = function(editingType, dx, dy) {
        var tempParams = Object.create(this._coords);
        
        switch (editingType) {
            case 'move':
                tempParams.x += dx;
                tempParams.y += dy;
                break;
            
            case 'editLeft':
                tempParams.x += dx; 
                tempParams.width -= dx;
                break;
            
            case 'editRight':
                tempParams.width += dx;
                break;
            
            case 'editTop':
                tempParams.y += dy;
                tempParams.height -= dy;
                break;
            
            case 'editBottom':
                tempParams.height += dy;
                break;
               
            case 'editTopLeft':
                tempParams.x += dx;
                tempParams.y += dy;
                tempParams.width -= dx;
                tempParams.height -= dy;
                break;
                
            case 'editTopRight':
                tempParams.y += dy;
                tempParams.width += dx;
                tempParams.height -= dy;
                break;
            
            case 'editBottomLeft':
                tempParams.x += dx;
                tempParams.width -= dx;
                tempParams.height += dy;
                break;
            
            case 'editBottomRight':
                tempParams.width += dx;
                tempParams.height += dy;
                break;
        }

        return tempParams;
    };
    
    /**
     * Calculates new coordinates in process of editing
     * 
     * @param coords {Object} - area coords 
     * @param saveProportions {boolean}
     * @returns {Object} - new coordinates of area
     */
    Rectangle.prototype.dynamicEdit = function(coords, saveProportions) {
        coords = Rectangle.getNormalizedCoords(coords);
        
        if (saveProportions) {
            coords = Rectangle.getSavedProportionsCoords(coords);
        }
        
        this.redraw(coords);
        
        return coords;
    };
    
    /**
     * Handler for editing process (by mousemove)
     * It includes only redrawing area by new coords 
     * (this coords doesn't save as own area coords)
     * 
     * @params e {MouseEvent} - mousemove event
     */
    Rectangle.prototype.onProcessEditing = function(e) {
        return this.dynamicEdit(
            this.edit(
                app.getEditType(),
                e.pageX - this.editingStartPoint.x,
                e.pageY - this.editingStartPoint.y
            ),
            e.shiftKey
        );
    };
    
    /**
     * Handler for editing stoping (by mouseup)
     * It includes redrawing area by new coords 
     * and saving this coords as own area coords
     * 
     * @params e {MouseEvent} - mouseup event
     */
    Rectangle.prototype.onStopEditing = function(e) {
        this.setCoords(this.onProcessEditing(e));
        app.removeAllEvents();
    };

    /**
     * Returns string-representation of this rectangle
     * 
     * @returns {string}
     */
    Rectangle.prototype.toString = function() {
        return 'Rectangle {x: '+ this._coords.x + 
               ', y: ' + this._coords.y + 
               ', width: ' + this._coords.width + 
               ', height: ' + this._coords.height + '}';
    }
    
    /**
     * Returns html-string of area html element with params of this rectangle
     * 
     * @returns {string}
     */
    Rectangle.prototype.toHTMLMapElementString = function() {
        var x2 = this._coords.x + this._coords.width,
            y2 = this._coords.y + this._coords.height;
            
        return '<area shape="rect" coords="' // TODO: use template engine
            + this._coords.x + ', '
            + this._coords.y + ', '
            + x2 + ', '
            + y2
            + '"'
            + (this._attributes.href ? ' href="' + this._attributes.href + '"' : '')
            + (this._attributes.alt ? ' alt="' + this._attributes.alt + '"' : '')
            + (this._attributes.title ? ' title="' + this._attributes.title + '"' : '')
            + ' />';
    };

    /**
     * Returns coords for area attributes form
     * 
     * @returns {Object} - object width coordinates of point
     */
    Rectangle.prototype.getCoordsForDisplayingInfo = function() {
        return {
            x : this._coords.x,
            y : this._coords.y
        };
    };
    
    /**
     * Returns true if coords is valid for rectangles and false otherwise
     *
     * @static
     * @param coords {Object} - object with coords for new rectangle
     * @return {boolean}
     */
    Rectangle.testCoords = function(coords) {
        return coords.x && coords.y && coords.width && coords.height;
    };
    
    /**
     * Returns true if html coords array is valid for rectangles and false otherwise
     *
     * @static
     * @param coords {Array} - coords for new rectangle as array
     * @return {boolean}
     */
    Rectangle.testHTMLCoords = function(coords) {
        return coords.length === 4;
    };

    /**
     * Return rectangle coords object from html array
     * 
     * @param htmlCoordsArray {Array}
     * @returns {Object}
     */
    Rectangle.getCoordsFromHTMLArray = function(htmlCoordsArray) {
        if (!Rectangle.testHTMLCoords(htmlCoordsArray)) {    
            throw new Error('This html-coordinates is not valid for rectangle');
        }

        return {
            x : htmlCoordsArray[0],
            y : htmlCoordsArray[1],
            width : htmlCoordsArray[2] - htmlCoordsArray[0],
            height : htmlCoordsArray[3] - htmlCoordsArray[1]
        };
    };

    /**
     * Fixes coords if width or/and height are negative
     * 
     * @static
     * @param coords {Object} - Coordinates of this area 
     * @returns {Object} - Normalized coordinates of area
     */
    Rectangle.getNormalizedCoords = function(coords) {
        if (coords.width < 0) {
            coords.x += coords.width;
            coords.width = Math.abs(coords.width);
        }
        
        if (coords.height < 0) {
            coords.y += coords.height;
            coords.height = Math.abs(coords.height);
        }
        
        return coords;
    };
    
    /**
     * Returns coords with equivivalent width and height
     * 
     * @static
     * @param coords {Object} - Coordinates of this area 
     * @returns {Object} - Coordinates of area with equivivalent width and height
     */
    Rectangle.getSquareCoords = function(coords) {
        var width = Math.abs(coords.width),
            height = Math.abs(coords.height);
        
        if (width > height) {
            coords.width = coords.width > 0 ? height : -height;
        } else {
            coords.height = coords.height > 0 ? width : -width;
        }
        
        return coords;
    };
    
    /**
     * Returns coords with saved proportions of original area
     * 
     * @static
     * @param coords {Object} - Coordinates of this area 
     * @param originalCoords {Object} - Coordinates of the original area
     * @returns {Object} - Coordinates of area with saved proportions of original area
     */
    Rectangle.getSavedProportionsCoords = function(coords, originalCoords) {
        var originalProportions = coords.width / coords.height,
            currentProportions = originalCoords.width / originalCoords.height;
        
        if (currentProportions > originalProportions) {
            coords.width = Math.round(coords.height * originalProportions);
        } else {
            coords.height = Math.round(coords.width / originalProportions);
        }
        
        return coords;
    };
    
    /**
     * Creates new rectangle and adds drawing handlers for DOM-elements
     * 
     * @static
     * @param firstPointCoords {Object}
     * @returns {Rectangle}
     */
    Rectangle.createAndStartDrawing = function(firstPointCoords) {
        var newArea = new Rectangle({
            x : firstPointCoords.x,
            y : firstPointCoords.y,
            width: 0,
            height: 0
        });
        
        app.addEvent(app.domElements.container, 'mousemove', newArea.onProcessDrawing.bind(newArea))
           .addEvent(app.domElements.container, 'click', newArea.onStopDrawing.bind(newArea));
           
        return newArea;
    };
    

    /**
     * The constructor for circles
     *
     *     ------
     *  /         \
     * |  (x, y)<->| radius
     *  \         /
     *    ------
     *
     * @constructor
     * @param coords {Object} - object with parameters of new area (cx, cy, radius)
     *                          if some parameter is undefined, it will set 0
     * @param attributes {Object} [attributes=undefined] - attributes for area (e.g. href, title) 
     */
    function Circle(coords, attributes) {
        Area.call(this, 'circle', coords, attributes);
        
        /**
         * @namespace
         * @property {number} cx - Distance from the left edge of the image to the center of the circle
         * @property {number} cy - Distance from the top edge of the image to the center of the circle
         * @property {number} radius - Radius of the circle
         */
        this._coords = {
            cx : coords.cx || 0,
            cy : coords.cy || 0,
            radius : coords.radius || 0 
        };
        
        this._el = document.createElementNS(Area.SVG_NS, 'circle');
        this._groupEl.appendChild(this._el);
    
        this.helpers = {
            center : new Helper(this._groupEl, coords.cx, coords.cy, 'move'),
            top : new Helper(this._groupEl, coords.cx, coords.cy, 'editTop'),
            bottom : new Helper(this._groupEl, coords.cx, coords.cy, 'editBottom'),
            left : new Helper(this._groupEl, coords.cx, coords.cy, 'editLeft'),
            right : new Helper(this._groupEl, coords.cx, coords.cy, 'editRight')
        };
    
        this.redraw();
    }
    utils.inherits(Circle, Area);
    
    /**
     * Set attributes for svg-elements of area by new parameters
     * 
     * @param coords {Object} - Object with coords of this area (cx, cy, radius)
     * @returns {Circle} - this area
     */
    Circle.prototype.setSVGCoords = function(coords) {
        this._el.setAttribute('cx', coords.cx);
        this._el.setAttribute('cy', coords.cy);
        this._el.setAttribute('r', coords.radius);
    
        this.helpers.center.setCoords(coords.cx, coords.cy);
        this.helpers.top.setCoords(coords.cx, coords.cy - coords.radius);
        this.helpers.right.setCoords(coords.cx + coords.radius, coords.cy);
        this.helpers.bottom.setCoords(coords.cx, coords.cy + coords.radius);
        this.helpers.left.setCoords(coords.cx - coords.radius, coords.cy);
        
        return this;
    };
    
    /**
     * Set coords for this area
     * 
     * @param coords {Object} - coordinates for thia area
     * @returns {Circle} - this area
     */
    Circle.prototype.setCoords = function(coords) {
        this._coords.cx = coords.cx;
        this._coords.cy = coords.cy;
        this._coords.radius = coords.radius;
        
        return this;
    };
    
    /**
     * Calculates new coordinates in process of drawing
     * (for circle normalizeCoords() don't needed because 
     * radius are always positive)
     * 
     * @param x {number} - x-coordinate
     * @param y {number} - y-coordinate
     * @returns {Object} - calculated coordinates
     */
    Circle.prototype.dynamicDraw = function(x, y) {
        var radius = Math.round(
                Math.sqrt(
                    Math.pow(this._coords.cx - x, 2) +
                    Math.pow(this._coords.cy - y, 2)
                )
            ),
            newCoords = {
                cx : this._coords.cx,
                cy : this._coords.cy,
                radius : radius
            };

        this.redraw(newCoords);
        
        return newCoords;
    };
    
    /**
     * Handler for drawing process (by mousemove)
     * It includes only redrawing area by new coords 
     * (this coords doesn't save as own area coords)
     * 
     * @params e {MouseEvent} - mousemove event
     */
    Circle.prototype.onProcessDrawing = function(e) {
        var coords = utils.getRightCoords(e.pageX, e.pageY);
        
        this.dynamicDraw(coords.x, coords.y);
    };
    
    /**
     * Handler for drawing stoping (by second click)
     * It includes redrawing area by new coords 
     * and saving this coords as own area coords
     * 
     * @params e {MouseEvent} - click event
     */
    Circle.prototype.onStopDrawing = function(e) {
        var coords = utils.getRightCoords(e.pageX, e.pageY);
        
        this.setCoords(this.dynamicDraw(coords.x, coords.y)).deselect();
    
        app.removeAllEvents()
           .setIsDraw(false)
           .resetNewArea();
    };
    
    /**
     * Changes area parameters by editing type and offsets
     * 
     * @param {string} editingType - A type of editing
     * @returns {Object} - Object with changed parameters of area 
     */
    Circle.prototype.edit = function(editingType, dx, dy) {
        var tempParams = Object.create(this._coords);
        
        switch (editingType) {
            case 'move':
                tempParams.cx += dx;
                tempParams.cy += dy;
                break;
                
            case 'editTop':
                tempParams.radius -= dy;
                break;
            
            case 'editBottom':
                tempParams.radius += dy;
                break;
            
            case 'editLeft':
                tempParams.radius -= dx;
                break;
            
            case 'editRight':
                tempParams.radius += dx;
                break;
        }
        
        return tempParams;
    };
    
    /**
     * Calculates new coordinates in process of editing
     * 
     * @param tempCoords {Object} - area coords 
     * @returns {Object} - calculated coordinates
     */
    Circle.prototype.dynamicEdit = function(tempCoords) {
        if (tempCoords.radius < 0) {
            tempCoords.radius = Math.abs(tempCoords.radius);
        }
        
        this.setSVGCoords(tempCoords);
        
        return tempCoords;
    };
    
    /**
     * Handler for editing process (by mousemove)
     * It includes only redrawing area by new coords 
     * (this coords doesn't save as own area coords)
     * 
     * @params e {MouseEvent} - mousemove event
     */
    Circle.prototype.onProcessEditing = function(e) {
        var editType = app.getEditType();
        
        return this.dynamicEdit(
            this.edit(editType, e.pageX - this.editingStartPoint.x, e.pageY - this.editingStartPoint.y)
        );
    };
    
    /**
     * Handler for editing stoping (by mouseup)
     * It includes redrawing area by new coords 
     * and saving this coords as own area coords
     * 
     * @params e {MouseEvent} - mouseup event
     */
    Circle.prototype.onStopEditing = function(e) {
        var editType = app.getEditType();
        
        this.setCoords(this.onProcessEditing(e));
        
        app.removeAllEvents();
    };
    
    /**
     * Returns string-representation of circle
     * 
     * @returns {string}
     */
    Circle.prototype.toString = function() {
        return 'Circle {cx: '+ this._coords.cx +
                ', cy: ' + this._coords.cy +
                ', radius: ' + this._coords.radius + '}';
    }
    
    /**
     * Returns html-string of area html element with params of this circle
     * 
     * @returns {string}
     */
    Circle.prototype.toHTMLMapElementString = function() {
        return '<area shape="circle" coords="'
            + this._coords.cx + ', '
            + this._coords.cy + ', '
            + this._coords.radius
            + '"'
            + (this._attributes.href ? ' href="' + this._attributes.href + '"' : '')
            + (this._attributes.alt ? ' alt="' + this._attributes.alt + '"' : '')
            + (this._attributes.title ? ' title="' + this._attributes.title + '"' : '')
            + ' />';
    };

    /**
     * Returns coords for area attributes form
     * 
     * @returns {Object} - coordinates of point
     */
    Circle.prototype.getCoordsForDisplayingInfo = function() {
        return {
            x : this._coords.cx,
            y : this._coords.cy
        };
    };
    
    /**
     * Returns true if coords is valid for circles and false otherwise
     *
     * @static
     * @param coords {Object} - object width coords for new circle
     * @return {boolean}
     */
    Circle.testCoords = function(coords) {
        return coords.cx && coords.cy && coords.radius;
    };

    /**
     * Returns true if html coords array is valid for circles and false otherwise
     *
     * @static
     * @param coords {Array} - coords for new circle as array
     * @return {boolean}
     */
    Circle.testHTMLCoords = function(coords) {
        return coords.length === 3;
    };

    /**
     * Returns circle coords object from html array
     * 
     * @param htmlCoordsArray {Array}
     * @returns {Object}
     */
    Circle.getCoordsFromHTMLArray = function(htmlCoordsArray) {
        if (!Circle.testHTMLCoords(htmlCoordsArray)) {    
            throw new Error('This html-coordinates is not valid for circle');
        }

        return {
            cx : htmlCoordsArray[0],
            cy : htmlCoordsArray[1],
            radius : htmlCoordsArray[2]
        };
    };
    
    /**
     * Creates new circle and adds drawing handlers for DOM-elements
     *
     * @static
     * @param firstPointCoords {Object} 
     * @returns {Circle}
     */
    Circle.createAndStartDrawing = function(firstPointCoords) {
        var newArea = new Circle({
            cx : firstPointCoords.x,
            cy : firstPointCoords.y,
            radius : 0
        });
        
        app.addEvent(app.domElements.container, 'mousemove', newArea.onProcessDrawing.bind(newArea))
           .addEvent(app.domElements.container, 'click', newArea.onStopDrawing.bind(newArea));
           
        return newArea;
    };

    /**
     * The constructor for polygons
     *  
     *        {x0, y0}  
     *           /\
     *          /  \
     *         /    \   
     * {x1, y1} ----- {x2, y2}
     *
     * @constructor
     * @param coords {Object} - object with parameters of new area ('points' is list of points)
     *                          if 'points' is empty, it will set to [(0,0)]
     * @param coords.isOpened {boolean} - if polygon is opened (polyline instead polygon)
     * @param attributes {Object} [attributes=undefined] - attributes for area (e.g. href, title)
     */
    function Polygon(coords, attributes) {
        Area.call(this, 'polygon', coords, attributes);
        
        /**
         * @namespace
         * @property {Array} points - Array with coordinates of polygon points
         */
        this._coords = {
            points : coords.points || [{x: 0, y: 0}],
            isOpened : coords.isOpened || false
        };
        
        this._el = document.createElementNS(
            Area.SVG_NS, 
            this._coords.isOpened ? 'polyline' : 'polygon'
        );
        this._groupEl.appendChild(this._el);

        this._helpers = { 
            points : []
        };

        for (var i = 0, c = this._coords.points.length; i < c; i++) {
            this._helpers.points.push(
                (new Helper(
                    this._groupEl, 
                    this._coords.points[i].x, 
                    this._coords.points[i].y, 
                    'movePoint')
                ).setId(i)
            );
        }
        
        this._selectedPoint = -1;
        
        this.redraw();
    }
    utils.inherits(Polygon, Area);
    
    /**
     * Closes path of the polygon (replaces polyline with polygon)
     */
    Polygon.prototype.close = function() {
        var polyline = this._el;
        this._el = document.createElementNS(Area.SVG_NS, 'polygon');
        this._groupEl.replaceChild(this._el, polyline);

        this._coords.isOpened = false;
        this.redraw().deselect();
    };
    
    /**
     * Set attributes for svg-elements of area by new parameters
     * 
     * @param coords {Object} - Object with coords of this area, with field 'points'
     * @returns {Polygon} - this area
     */
    Polygon.prototype.setSVGCoords = function(coords) {
        var polygonPointsAttrValue = coords.points.reduce(function(previousValue, currentItem) {
            return previousValue + currentItem.x + ' ' + currentItem.y + ' ';
        }, '');
        
        this._el.setAttribute('points', polygonPointsAttrValue);
        utils.foreach(this._helpers.points, function(helper, i) {
            helper.setCoords(coords.points[i].x, coords.points[i].y);
        });
        
        return this;
    };
    
    /**
     * Set coords for this area
     * 
     * @param coords {coords}
     * @returns {Polygon} - this area
     */
    Polygon.prototype.setCoords = function(coords) {
        this._coords.points = coords.points;
    
        return this;
    };
    
    /**
     * Adds new point to polygon (and new helper too)
     * 
     * @param x {number} - x-coordinate of new point
     * @param y {number} - y-coordinate of new point
     * @returns {Polygon} - this area
     */
    Polygon.prototype.addPoint = function(x, y) {
        if (!this._coords.isOpened) {
            throw new Error('This polygon is closed!');
        }

        var helper = new Helper(this._groupEl, x, y, 'movePoint');
        helper.setId(this._helpers.points.length);

        this._helpers.points.push(helper);
        this._coords.points.push({
            x : x, 
            y : y
        });
        this.redraw();
        
        return this;
    };
    
    /**
     * Calculates new coordinates in process of drawing
     * 
     * @param x {number}
     * @param y {number}
     * @param isRightAngle {boolean}
     * @returns {Object} - calculated coordinates
     */
    Polygon.prototype.dynamicDraw = function(x, y, isRightAngle) {
        var temp_coords = {
            points: [].concat(this._coords.points)
        };
    
        if (isRightAngle) {
            var rightPointCoords = Polygon.getRightAngleLineLastPointCoords(
                this._coords, {x: x, y: y}
            );
            x = rightPointCoords.x;
            y = rightPointCoords.y;
        }
        
        temp_coords.points.push({x : x, y : y});
    
        this.redraw(temp_coords);
        
        return temp_coords;
    };
    
    /**
     * Handler for drawing process (by mousemove)
     * It includes only redrawing area by new coords 
     * (this coordinates doesn't save as own area coords)
     * 
     * @params e {MouseEvent} - mousemove event
     */
    Polygon.prototype.onProcessDrawing = function(e) {
        var coords = utils.getRightCoords(e.pageX, e.pageY);
            
        this.dynamicDraw(coords.x, coords.y, e.shiftKey);
    };
    
    /**
     * Handler for polygon pointer adding (by click on drawing canvas)
     * It includes redrawing area with this new point 
     * and saving this point to list of polygon points
     * 
     * @params e {MouseEvent} - click event
     */
    Polygon.prototype.onAddPointDrawing = function(e) {
        var newPointCoords = utils.getRightCoords(e.pageX, e.pageY);

        if (e.shiftKey) {
            newPointCoords = Polygon.getRightAngleLineLastPointCoords(this._coords, newPointCoords);
        }
        
        this.addPoint(newPointCoords.x, newPointCoords.y);
    };
    
    /**
     * Handler for drawing stoping (by click on first helper or press ENTER key)
     * It includes redrawing area by new coords, closing this polygon 
     * and saving this coords as own area coords
     * 
     * @params e {KeyboardEvent|MouseEvent} - click or keydown event
     */
    Polygon.prototype.onStopDrawing = function(e) {
        if (e.type == 'click' || (e.type == 'keydown' && e.keyCode == 13)) {
            if (Polygon.testCoords(this._coords)) {
                this.close();
                
                app.removeAllEvents()
                   .setIsDraw(false)
                   .resetNewArea();
            }
        }
        e.stopPropagation();
    };

    /**
     * Changes area parameters by editing type and offsets
     * 
     * @param {string} editingType - A type of editing
     * @returns {Object} - Object with changed parameters of area 
     */
    Polygon.prototype.edit = function(editingType, dx, dy) {
        var tempParams = Object.create(this._coords);
        
        switch (editingType) {
            case 'move':
                for (var i = 0, c = tempParams.points.length; i < c; i++) {
                    tempParams.points[i].x += dx;
                    tempParams.points[i].y += dy;
                }
                break;
            
            case 'movePoint':
                tempParams.points[this.selected_point].x += dx;
                tempParams.points[this.selected_point].y += dy;
                break;
        }

        return tempParams;
    };
    
    /**
     * Handler for editing process (by mousemove)
     * It includes only redrawing area by new coords
     * (this coords doesn't save as area coords)
     * 
     * @params e {MouseEvent} - mousemove event
     */
    Polygon.prototype.onProcessEditing = function(e) {
        var editType = app.getEditType();
        
        this.redraw(
            this.edit(
                editType, 
                e.pageX - this.editingStartPoint.x, 
                e.pageY - this.editingStartPoint.y
            )
        );

        this.editingStartPoint.x = e.pageX;
        this.editingStartPoint.y = e.pageY;
    };
    
    /**
     * Handler for editing stoping (by mouseup on drawing canvas)
     * It includes redrawing area by new coords and saving this new coords
     * as own area coords
     * 
     * @params e {MouseEvent} - click or keydown event
     */
    Polygon.prototype.onStopEditing = function(e) {
        var editType = app.getEditType();
    
        this.setCoords(
            this.edit(
                editType, 
                e.pageX - this.editingStartPoint.x, 
                e.pageY - this.editingStartPoint.y
            )
        ).redraw();
    
        app.removeAllEvents();
    };
    
    /**
     * Returns string-representation of polygon
     * 
     * @returns {string}
     */
    Polygon.prototype.toString = function() {
        return 'Polygon {points: ['+ 
               this._coords.points.map(function(item) {
                   return '[' + item.x + ', ' + item.y + ']'
               }).join(', ') + ']}';
    }
    
    /**
     * Returns html-string of area html element with params of this polygon
     * 
     * @returns {string}
     */
    Polygon.prototype.toHTMLMapElementString = function() {
        var str = this._coords.points.map(function(item) {
            return item.x + ', ' + item.y;
        }).join(', ');
        
        return '<area shape="poly" coords="'
            + str
            + '"'
            + (this._attributes.href ? ' href="' + this._attributes.href + '"' : '')
            + (this._attributes.alt ? ' alt="' + this._attributes.alt + '"' : '')
            + (this._attributes.title ? ' title="' + this._attributes.title + '"' : '')
            + ' />';
    };

    /**
     * Returns coords for area attributes form
     * 
     * @returns {Object} - coordinates of point
     */
    Polygon.prototype.getCoordsForDisplayingInfo = function() {
        return {
            x : this._coords.points[0].x,
            y : this._coords.points[0].y
        };
    };
    
    /**
     * Returns true if coords is valid for polygons and false otherwise
     *
     * @static
     * @param coords {Object} - object with coords for new polygon
     * @returns {boolean}
     */
    Polygon.testCoords = function(coords) {
        return coords.points.length >= 3;
    };

    /**
     * Returns true if html coords array is valid for polygons and false otherwise
     *
     * @static
     * @param coords {Array} - coords for new polygon as array [x1, y1, x2, y2, x3, y3, ...]
     * @returns {boolean}
     */
    Polygon.testHTMLCoords = function(coords) {
        return coords.length >= 6 && coords.length % 2 === 0;
    };

    /**
     * Returns polygon coords object from html array
     * 
     * @param htmlCoordsArray {Array}
     * @returns {Object} - object with calculated points
     */
    Polygon.getCoordsFromHTMLArray = function(htmlCoordsArray) {
        if (!Polygon.testHTMLCoords(htmlCoordsArray)) {    
            throw new Error('This html-coordinates is not valid for polygon');
        }

        var points = [];
        for (var i = 0, c = htmlCoordsArray.length/2; i < c; i++) {
            points.push({
                x : htmlCoordsArray[2*i],
                y : htmlCoordsArray[2*i + 1]
            });
        }

        return {
            points : points
        };
    };

    /**
     * Returns coords of new point with right angle (or 45 deg) for last line
     * This method recalculates coordinates of new point for 
     * last line with (0 | 45 | 90 | 135 | 180 | 225 | 270 | 315) deg
     * For example,
     * for (0 < deg < 23) -> 0 deg
     * for (23 < deg < 67) -> 45 deg
     * for (67 < deg < 90) -> 90 deg etc.
     * 
     *         0
     *    315\ | /45
     *        \|/
     * 270 --------- 90
     *        /|\
     *    225/ | \135
     *        180
     * 
     * @static
     * @param originalCoords {Object} - Coordinates of this area (without new point)
     * @param newPointCoords {Object} - Coordinates of new point
     * @returns {Object} - Right coordinates for last point
     */
    Polygon.getRightAngleLineLastPointCoords = function(originalCoords, newPointCoords) {
        var TANGENS = {
                DEG_22 : 0.414,
                DEG_67 : 2.414
            },
            lastPointIndex = originalCoords.points.length - 1,
            lastPoint = originalCoords.points[lastPointIndex],
            dx = newPointCoords.x - lastPoint.x,
            dy = -(newPointCoords.y - lastPoint.y),
            tan = dy / dx,
            x = newPointCoords.x,
            y = newPointCoords.y;
            
        if (dx > 0 && dy > 0) {
            if (tan > TANGENS.DEG_67) {
                x = lastPoint.x;
            } else if (tan < TANGENS.DEG_22) {
                y = lastPoint.y;
            } else {
                Math.abs(dx) > Math.abs(dy) ? 
                    (x = lastPoint.x + dy) : (y = lastPoint.y - dx);
            }
        } else if (dx < 0 && dy > 0) {
            if (tan < -TANGENS.DEG_67) {
                x = lastPoint.x;
            } else if (tan > -TANGENS.DEG_22) {
                y = lastPoint.y;
            } else {
                Math.abs(dx) > Math.abs(dy) ?
                    (x = lastPoint.x - dy) : (y = lastPoint.y + dx);
            }
        } else if (dx < 0 && dy < 0) {
            if (tan > TANGENS.DEG_67) {
                x = lastPoint.x;
            } else if (tan < TANGENS.DEG_22) {
                y = lastPoint.y;
            } else {
                Math.abs(dx) > Math.abs(dy) ? 
                    (x = lastPoint.x + dy) : (y = lastPoint.y - dx);
            }
        } else if (dx > 0 && dy < 0) {
            if (tan < -TANGENS.DEG_67) {
                x = lastPoint.x;
            } else if (tan > -TANGENS.DEG_22) {
                y = lastPoint.y;
            } else {
                Math.abs(dx) > Math.abs(dy) ? 
                    (x = lastPoint.x - dy) : (y = lastPoint.y + dx);
            }
        }
        
        return {
            x : x,
            y : y
        };
    };
    
    /**
     * Creates new polygon and add drawing handlers for DOM-elements
     *
     * @static
     * @param firstPointCoords {Object} - coords for first point of polyline
     * @returns {Polygon} - created polygon
     */
    Polygon.createAndStartDrawing = function(firstPointCoords) {
        var newArea = new Polygon({
            points : [firstPointCoords],
            isOpened : true
        });
        
        app.addEvent(app.domElements.container, 'mousemove', newArea.onProcessDrawing.bind(newArea))
           .addEvent(app.domElements.container, 'click', newArea.onAddPointDrawing.bind(newArea))
           .addEvent(document, 'keydown', newArea.onStopDrawing.bind(newArea))
           .addEvent(newArea._helpers.points[0]._el, 'click', newArea.onStopDrawing.bind(newArea));
           
        return newArea;
    };

    /* TODO: this modules will use app.js */
    /* Help block */
    var help = (function() {
        var block = utils.id('help'),
            overlay = utils.id('overlay'),
            close_button = block.querySelector('.close_button');
            
        function hide() {
            utils.hide(block);
            utils.hide(overlay);
        }
        
        function show() {
            utils.show(block);
            utils.show(overlay);
        }
            
        overlay.addEventListener('click', hide, false);
            
        close_button.addEventListener('click', hide, false);
            
        return {
            show : show,
            hide : hide
        };
    })();

    /* For html code of created map */
    var code = (function(){
        var block = utils.id('code'),
            content = utils.id('code_content'),
            close_button = block.querySelector('.close_button');
            
        close_button.addEventListener('click', function(e) {
            utils.hide(block);
            e.preventDefault();
        }, false);
            
        return {
            print: function() {
                content.innerHTML = app.getHTMLCode(true);
                utils.show(block);
            },
            hide: function() {
                utils.hide(block);
            }
        };
    })();
    

    /* Edit selected area info */
    var info = (function() {
        var form = utils.id('edit_details'),
            header = form.querySelector('h5'),
            href_attr = utils.id('href_attr'),
            alt_attr = utils.id('alt_attr'),
            title_attr = utils.id('title_attr'),
            save_button = utils.id('save_details'),
            close_button = form.querySelector('.close_button'),
            sections = form.querySelectorAll('p'),
            obj,
            x,
            y,
            temp_x,
            temp_y;
        
        function changedReset() {
            form.classList.remove('changed');
            utils.foreach(sections, function(x) {
                x.classList.remove('changed');
            });
        }
        
        function save(e) {
            obj.setInfoAttributes({
                href : href_attr.value,
                alt : alt_attr.value,
                title : title_attr.value,
            });
            
            obj[obj.href ? 'setStyleOfElementWithHref' : 'unsetStyleOfElementWithHref']();
            
            changedReset();
            unload();
                
            e.preventDefault();
        }
        
        function unload() {
            obj = null;
            changedReset();
            utils.hide(form);
        }
        
        function setCoords(x, y) {
            form.style.left = (x + 5) + 'px';
            form.style.top = (y + 5) + 'px';
        }
        
        function moveEditBlock(e) {
            setCoords(x + e.pageX - temp_x, y + e.pageY - temp_y);
        }
        
        function stopMoveEditBlock(e) {
            x = x + e.pageX - temp_x;
            y = y + e.pageY - temp_y;
            setCoords(x, y);
            
            app.removeAllEvents();
        }
        
        function change() {
            form.classList.add('changed');
            this.parentNode.classList.add('changed');
        }
        
        save_button.addEventListener('click', save, false);
        
        href_attr.addEventListener('keydown', function(e) { e.stopPropagation(); }, false);
        alt_attr.addEventListener('keydown', function(e) { e.stopPropagation(); }, false);
        title_attr.addEventListener('keydown', function(e) { e.stopPropagation(); }, false);
        
        href_attr.addEventListener('change', change, false);
        alt_attr.addEventListener('change', change, false);
        title_attr.addEventListener('change', change, false);
        
        close_button.addEventListener('click', unload, false);
        
        header.addEventListener('mousedown', function(e) {
            temp_x = e.pageX,
            temp_y = e.pageY;
            
            app.addEvent(document, 'mousemove', moveEditBlock);
            app.addEvent(header, 'mouseup', stopMoveEditBlock);
            
            e.preventDefault();
        }, false);
        
        return {
            load : function(object, new_x, new_y) {
                obj = object;
                href_attr.value = object.href ? object.href : '';
                alt_attr.value = object.alt ? object.alt : '';
                title_attr.value = object.title ? object.title : '';
                utils.show(form);
                if (new_x && new_y) {
                    x = new_x;
                    y = new_y;
                    setCoords(x, y);
                }
            },
            unload : unload
        };
    })();


    /* Load areas from html code */
    var from_html_form = (function() {
        var form = utils.id('from_html_wrapper'),
            code_input = utils.id('code_input'),
            load_button = utils.id('load_code_button'),
            close_button = form.querySelector('.close_button');
        
        function load(e) {
            if (Area.createAreasFromHTMLOfMap(code_input.value)) {
                hide();
            }
                
            e.preventDefault();
        }
        
        function hide() {
            utils.hide(form);
        }
        
        load_button.addEventListener('click', load, false);
        
        close_button.addEventListener('click', hide, false);
        
        return {
            show : function() {
                code_input.value = '';
                utils.show(form);
            },
            hide : hide
        };
    })();


    /* Get image form */
    var get_image = (function() {
        var block = utils.id('get_image_wrapper'),
            close_button = block.querySelector('.close_button'),
            loading_indicator = utils.id('loading'),
            button = utils.id('button'),
            filename = null,
            last_changed = null;
            
        // Drag'n'drop - the first way to loading an image
        var drag_n_drop = (function() {
            var dropzone = utils.id('dropzone'),
                dropzone_clear_button = dropzone.querySelector('.clear_button'),
                sm_img = utils.id('sm_img');
            
            function testFile(type) {
                switch (type) {
                    case 'image/jpeg':
                    case 'image/gif':
                    case 'image/png':
                        return true;
                }
                return false;
            }
            
            dropzone.addEventListener('dragover', function(e){
                utils.stopEvent(e);
            }, false);
            
            dropzone.addEventListener('dragleave', function(e){
                utils.stopEvent(e);
            }, false);
    
            dropzone.addEventListener('drop', function(e){
                utils.stopEvent(e);
    
                var reader = new FileReader(),
                    file = e.dataTransfer.files[0];
                
                if (testFile(file.type)) {
                    dropzone.classList.remove('error');
                    
                    reader.readAsDataURL(file);
                    
                    reader.onload = function(e) {
                        sm_img.src = e.target.result;
                        sm_img.style.display = 'inline-block';
                        filename = file.name;
                        utils.show(dropzone_clear_button);
                        last_changed = drag_n_drop;
                    };
                } else {
                    clearDropzone();
                    dropzone.classList.add('error');
                }
    
            }, false);
    
            function clearDropzone() {
                sm_img.src = '';
                
                utils.hide(sm_img)
                     .hide(dropzone_clear_button);
                     
                dropzone.classList.remove('error');
                     
                last_changed = url_input;
            }
            
            dropzone_clear_button.addEventListener('click', clearDropzone, false);
    
            return {
                clear : clearDropzone,
                init : function() {
                    dropzone.draggable = true;
                    this.clear();
                    utils.hide(sm_img)
                         .hide(dropzone_clear_button);
                },
                test : function() {
                    return Boolean(sm_img.src);
                },
                getImage : function() {
                    return sm_img.src;
                }
            };
        })();
        
        /* Set a url - the second way to loading an image */
        var url_input = (function() {
            var url = utils.id('url'),
                url_clear_button = url.parentNode.querySelector('.clear_button');
            
            function testUrl(str) {
                var url_str = str.trim(),
                    temp_array = url_str.split('.'),
                    ext;
    
                if(temp_array.length > 1) {
                    ext = temp_array[temp_array.length-1].toLowerCase();
                    switch (ext) {
                        case 'jpg':
                        case 'jpeg':
                        case 'gif':
                        case 'png':
                            return true;
                    }
                }
                
                return false;
            }
            
            function onUrlChange() {
                setTimeout(function(){
                    if(url.value.length) {
                        utils.show(url_clear_button);
                        last_changed = url_input;
                    } else {
                        utils.hide(url_clear_button);
                        last_changed = drag_n_drop;
                    }
                }, 0);
            }
            
            url.addEventListener('keypress', onUrlChange, false);
            url.addEventListener('change', onUrlChange, false);
            url.addEventListener('paste', onUrlChange, false);
            
            function clearUrl() {
                url.value = '';
                utils.hide(url_clear_button);
                url.classList.remove('error');
                last_changed = url_input;
            }
            
            url_clear_button.addEventListener('click', clearUrl, false);
    
            return {
                clear : clearUrl,
                init : function() {
                    this.clear();
                    utils.hide(url_clear_button);
                },
                test : function() {
                    if(testUrl(url.value)) {
                        url.classList.remove('error');
                        return true;
                    } else {
                        url.classList.add('error');
                    }
                    return false;
                },
                getImage : function() {
                    var tmp_arr = url.value.split('/');
                        filename = tmp_arr[tmp_arr.length - 1];
                        
                    return url.value.trim();
                }
            };
        })();
        
        
        /* Block init */
        function init() {
            utils.hide(loading_indicator);
            drag_n_drop.init();
            url_input.init();
        }
        init();
        
        /* Block clear */
        function clear() {
            drag_n_drop.clear();
            url_input.clear();
            last_changed = null;
        }
        
        /* Selected image loading */
        function onButtonClick(e) {
            if (last_changed === url_input && url_input.test()) {
                app.loadImage(url_input.getImage()).setFilename(filename);
            } else if (last_changed === drag_n_drop && drag_n_drop.test()) {
                app.loadImage(drag_n_drop.getImage()).setFilename(filename);
            }
            
            e.preventDefault();
        }
        
        button.addEventListener('click', onButtonClick, false);
        
        close_button.addEventListener('click', hide, false);
        
        function show() {
            clear();
            utils.show(block);
        }
        
        function hide() {
            utils.hide(block);
        }
        
        /* Returned object */
        return {
            show : function() {
                app.hide();
                show();
                
                return this;
            },
            hide : function() {
                app.show();
                hide();
                
                return this;
            },
            showLoadIndicator : function() {
                utils.show(loading_indicator);
                
                return this;
            },
            hideLoadIndicator : function() {
                utils.hide(loading_indicator);
                
                return this;
            }
        };
    })();
    get_image.show();
    

    /* Buttons and actions */
    var buttons = (function() {
        var all = utils.id('nav').getElementsByTagName('li'),
            save = utils.id('save'),
            load = utils.id('load'),
            rectangle = utils.id('rectangle'),
            circle = utils.id('circle'),
            polygon = utils.id('polygon'),
            edit = utils.id('edit'),
            clear = utils.id('clear'),
            from_html = utils.id('from_html'),
            to_html = utils.id('to_html'),
            preview = utils.id('preview'),
            new_image = utils.id('new_image'),
            show_help = utils.id('show_help');
        
        function deselectAll() {
            utils.foreach(all, function(x) {
                x.classList.remove(Area.CLASS_NAMES.SELECTED);
            });
        }
        
        function selectOne(button) {
            deselectAll();
            button.classList.add(Area.CLASS_NAMES.SELECTED);
        }
        
        function onSaveButtonClick(e) {
            // Save in localStorage
            app.saveInLocalStorage();
            
            e.preventDefault();
        }
        
        function onLoadButtonClick(e) {
            // Load from localStorage
            app.clear()
               .loadFromLocalStorage();
            
            e.preventDefault();
        }
        
        function onShapeButtonClick(e) {
            // shape = rect || circle || polygon
            app.setMode('drawing')
               .setDrawClass()
               .setShape(this.id)
               .deselectAll()
               .hidePreview();
            info.unload();
            selectOne(this);
            
            e.preventDefault();
        }
        
        function onClearButtonClick(e) {
            // Clear all
            if (confirm('Clear all?')) {
                app.setMode(null)
                    .setDefaultClass()
                    .setShape(null)
                    .clear()
                    .hidePreview();
                deselectAll();
            }
            
            e.preventDefault();
        }
        
        function onFromHtmlButtonClick(e) {
            // Load areas from html
            from_html_form.show();
            
            e.preventDefault();
        }
        
        function onToHtmlButtonClick(e) {
            // Generate html code only
            info.unload();
            code.print();
            
            e.preventDefault();
        }
        
        function onPreviewButtonClick(e) {
            if (app.getMode() === 'preview') {
                app.setMode(null)
                   .hidePreview();
                deselectAll();
            } else {
                app.deselectAll()
                   .setMode('preview')
                   .setDefaultClass()
                   .preview();
                selectOne(this);
            }
            
            e.preventDefault();
        }
        
        function onEditButtonClick(e) {
            if (app.getMode() === 'editing') {
                app.setMode(null)
                   .setDefaultClass()
                   .deselectAll();
                deselectAll();
                utils.show(domElements.svg);
            } else {
                app.setShape(null)
                   .setMode('editing')
                   .setEditClass();
                selectOne(this);
            }
            app.hidePreview();
            e.preventDefault();
        }
        
        function onNewImageButtonClick(e) {
            // New image - clear all and back to loading image screen
            if(confirm('Discard all changes?')) {
                app.setMode(null)
                   .setDefaultClass()
                   .setShape(null)
                   .setIsDraw(false)
                   .clear()
                   .hide()
                   .hidePreview();
                deselectAll();
                get_image.show();
            } 
            
            e.preventDefault();
        }
        
        function onShowHelpButtonClick(e) {
            help.show();
            
            e.preventDefault();
        }
        
        save.addEventListener('click', onSaveButtonClick, false);
        load.addEventListener('click', onLoadButtonClick, false);
        rectangle.addEventListener('click', onShapeButtonClick, false);
        circle.addEventListener('click', onShapeButtonClick, false);
        polygon.addEventListener('click', onShapeButtonClick, false);
        clear.addEventListener('click', onClearButtonClick, false);
        from_html.addEventListener('click', onFromHtmlButtonClick, false);
        to_html.addEventListener('click', onToHtmlButtonClick, false);
        preview.addEventListener('click', onPreviewButtonClick, false);
        edit.addEventListener('click', onEditButtonClick, false);
        new_image.addEventListener('click', onNewImageButtonClick, false);
        show_help.addEventListener('click', onShowHelpButtonClick, false);
    })();

})();
