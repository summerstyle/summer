/*
 * Summer html image map creator
 * http://github.com/summerstyle/summer
 *
 * Copyright 2016 Vera Lobacheva (http://iamvera.com)
 * Released under the MIT license
 */

'use strict';

var summerHtmlImageMapCreator = (function() {

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
        }
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
            },
            AREAS_CONSTRUCTORS = {
                'rect' : Rect,
                'circle' : Circle,
                'polygon' : Polygon
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
                    state.selectedArea.delta = {
                        'x' : e.pageX,
                        'y' : e.pageY
                    };
    
                    if (e.target.classList.contains('helper')) {
                        var helper = e.target;
                        state.editType = helper.action;
    
                        if (helper.n >= 0) { // if typeof selected_area == polygon
                            state.selectedArea.selected_point = helper.n;
                        }
                        
                        app.addEvent(domElements.container, 'mousemove', state.selectedArea.onEdit)
                           .addEvent(domElements.container, 'mouseup', state.selectedArea.onEditStop);
                    } else if (e.target.tagName === 'rect' || e.target.tagName === 'circle' || e.target.tagName === 'polygon') {
                        state.editType = 'move';
                        
                        app.addEvent(domElements.container, 'mousemove', state.selectedArea.onEdit)
                           .addEvent(domElements.container, 'mouseup', state.selectedArea.onEditStop);
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
                switch (state.currentType) {
                    case 'rect':
                        state.newArea = new Rect(utils.getRightCoords(e.pageX, e.pageY));
                        
                        app.addEvent(domElements.container, 'mousemove', state.newArea.onDraw)
                           .addEvent(domElements.container, 'click', state.newArea.onDrawStop);
                            
                        break;
                    case 'circle':
                        state.newArea = new Circle(utils.getRightCoords(e.pageX, e.pageY));
                            
                        app.addEvent(domElements.container, 'mousemove', state.newArea.onDraw)
                           .addEvent(domElements.container, 'click', state.newArea.onDrawStop);
                        
                        break;
                    case 'polygon':
                        state.newArea = new Polygon(utils.getRightCoords(e.pageX, e.pageY));
                        
                        app.addEvent(domElements.container, 'mousemove', state.newArea.onDraw)
                           .addEvent(domElements.container, 'click', state.newArea.onDrawAddPoint)
                           .addEvent(document, 'keydown', state.newArea.onDrawStop)
                           .addEvent(state.newArea.helpers[0].helper, 'click', state.newArea.onDrawStop);
                        
                    break;
                }  
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
                        state.selectedArea.setParams(
                            state.selectedArea.dynamicEdit(state.selectedArea.move(0, -1))
                        );
                        e.preventDefault();
                    }
                    
                    break;
                
                case KEYS.BOTTOM:
                    if (state.appMode === 'editing' && state.selectedArea) {
                        state.selectedArea.setParams(
                            state.selectedArea.dynamicEdit(state.selectedArea.move(0, 1))
                        );
                        e.preventDefault();
                    }
                    break;
                
                case KEYS.LEFT: 
                    if (state.appMode === 'editing' && state.selectedArea) {
                        state.selectedArea.setParams(
                            state.selectedArea.dynamicEdit(state.selectedArea.move(-1, 0))
                        );
                        e.preventDefault();
                    }
                    
                    break;
                
                case KEYS.RIGHT:
                    if (state.appMode === 'editing' && state.selectedArea) {
                        state.selectedArea.setParams(
                            state.selectedArea.dynamicEdit(state.selectedArea.move(1, 0))
                        );
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
                        var params = state.selectedArea.params,
                            x = params.x || params.cx || params[0],
                            y = params.y || params.cy || params[1];
                            
                        info.load(state.selectedArea, x + app.getOffset('x'), y + app.getOffset('y'));
                    }
                    
                    break;
                
                case KEYS.S:
                    app.saveInLocalStorage();
    
                    break;
                
                case KEYS.C:
                    if (state.appMode === 'editing' && state.selectedArea && ctrlDown) {
                        var Constructor = AREAS_CONSTRUCTORS[area_params.type],
                            area_params = state.selectedArea.toJSON();
                        
                        if (Constructor) {
                            Constructor.createFromSaved(area_params);
                            state.selectedArea.setParams(state.selectedArea.move(10, 10));
                            state.selectedArea.redraw();
                        }
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
                
                utils.foreach(obj.areas, function(x) {
                    switch (x.type) {
                        case 'rect':
                            if (x.coords.length === 4) {
                                Rect.createFromSaved({
                                    coords : x.coords,
                                    href   : x.href,
                                    alt    : x.alt,
                                    title  : x.title
                                });
                            }
                            break;
                        
                        case 'circle':
                            if (x.coords.length === 3) {
                                Circle.createFromSaved({
                                    coords : x.coords,
                                    href   : x.href,
                                    alt    : x.alt,
                                    title  : x.title
                                });
                            }
                            break;
                        
                        case 'polygon':
                            if (x.coords.length >= 6 && x.coords.length % 2 === 0) {
                                Polygon.createFromSaved({
                                    coords : x.coords,
                                    href   : x.href,
                                    alt    : x.alt,
                                    title  : x.title
                                });
                            }
                            break;
                    }
                });    
            }
        };
        
        // Will moved from the main module
        var localStorageWrapper = (function() {
            var KEY_NAME = 'SummerHTMLImageMapCreator';
            
            return {
                save : function() {
                    window.localStorage.setItem(KEY_NAME, areasIO.toJSON());
                
                    alert('Saved');
                },
                restore : function() {
                    areasIO.fromJSON(window.localStorage.getItem(KEY_NAME));
                }
            };
        })();
        
        /* Returned object */
        return {
            saveInLocalStorage : localStorageWrapper.save,
            loadFromLocalStorage : localStorageWrapper.restore,
            hide : function() {
                utils.hide(domElements.wrapper);
                return this;
            },
            show : function() {
                utils.show(domElements.wrapper);
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
                    map.innerHTML = app.getHTMLCode();
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
                        return state.offset.x;
    
                    case 'y':
                        return state.offset.y;
                }
                    
                return undefined;
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
                        html_code += '&nbsp;&nbsp;&nbsp;&nbsp;' + utils.encode(x.toString()) + '<br />';
                    });
                    html_code += utils.encode('</map>');
                } else {
                    utils.foreachReverse(state.areas, function(x) {
                        html_code += x.toString();
                    });
                }
                return html_code;
            }
        };
    })();

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
            obj.href = href_attr.value;
            obj.alt = alt_attr.value;
            obj.title = title_attr.value;
            
            obj[obj.href ? 'with_href' : 'without_href']();
            
            changedReset();
                
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
            close_button = form.querySelector('.close_button'),
            regexp_area = /<area(?=.*? shape="(rect|circle|poly)")(?=.*? coords="([\d ,]+?)")[\s\S]*?>/gmi,
            regexp_href = / href="([\S\s]+?)"/,
            regexp_alt = / alt="([\S\s]+?)"/,
            regexp_title = / title="([\S\s]+?)"/;
        
        function test(str) {
            var result_area,
                result_href,
                result_alt,
                result_title,
                type,
                coords,
                area,
                href,
                alt,
                title,
                success = false;
            
            if (str) {
                result_area = regexp_area.exec(str);
                
                while (result_area) {
                    success = true;
                    
                    area = result_area[0];
                    
                    type = result_area[1];
                    coords = result_area[2].split(/ ?, ?/);
                    
                    result_href = regexp_href.exec(area);
                    if (result_href) {
                        href = result_href[1];
                    } else {
                        href = '';
                    }
                    
                    result_alt = regexp_alt.exec(area);
                    if (result_alt) {
                        alt = result_alt[1];
                    } else {
                        alt = '';
                    }
                    
                    result_title = regexp_title.exec(area);
                    if (result_title) {
                        title = result_title[1];
                    } else {
                        title = '';
                    }
                    
                    for (var i = 0, len = coords.length; i < len; i++) {
                        coords[i] = Number(coords[i]);
                    }
                    
                    switch (type) {
                        case 'rect':
                            if (coords.length === 4) {
                                Rect.createFromSaved({
                                    coords : coords,
                                    href   : href,
                                    alt    : alt,
                                    title  : title
                                });
                            }
                            break;
                        
                        case 'circle':
                            if (coords.length === 3) {
                                Circle.createFromSaved({
                                    coords : coords,
                                    href   : href,
                                    alt    : alt,
                                    title  : title
                                });
                            }
                            break;
                        
                        case 'poly':
                            if (coords.length >= 6 && coords.length % 2 === 0) {
                                Polygon.createFromSaved({
                                    coords : coords,
                                    href   : href,
                                    alt    : alt,
                                    title  : title
                                });
                            }
                            break;
                    }
                    
                    result_area = regexp_area.exec(str);
                }
                
                if (success) {
                    hide();
                }
            }
        }
        
        function load(e) {
            test(code_input.value);
                
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
                    return sm_img.src ? true : false;
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
        
        /* Returned object */
        return {
            show : function() {
                clear();
                utils.show(block);
                
                return this;
            },
            hide : function() {
                utils.hide(block);
                
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
    

    /* Buttons and actions */
    var buttons = (function() {
        var all = utils.id('nav').getElementsByTagName('li'),
            save = utils.id('save'),
            load = utils.id('load'),
            rectangle = utils.id('rect'),
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
                x.classList.remove('selected');
            });
        }
        
        function selectOne(button) {
            deselectAll();
            button.classList.add('selected');
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
    
    
    /* AppEvent constructor */
    function AppEvent(target, eventType, func) {
        this.target = target;
        this.eventType = eventType;
        this.func = func;
        
        target.addEventListener(eventType, func, false);
    }
    
    AppEvent.prototype.remove = function() {
        this.target.removeEventListener(this.eventType, this.func, false);
    };


    /* Helper constructor */
    function Helper(node, x, y) {
        this.helper = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.helper.setAttribute('class', 'helper');
        this.helper.setAttribute('height', 5);
        this.helper.setAttribute('width', 5);
        this.helper.setAttribute('x', x-3);
        this.helper.setAttribute('y', y-3);
        node.appendChild(this.helper);
    }

    Helper.prototype.setCoords = function(x, y) {
        this.helper.setAttribute('x', x-3);
        this.helper.setAttribute('y', y-3);
        
        return this;
    };
    
    Helper.prototype.setAction = function(action) {
        this.helper.action = action;
        
        return this;
    };
    
    Helper.prototype.setCursor = function(cursor) {
        this.helper.classList.add(cursor);
        
        return this;
    };
    
    Helper.prototype.setId = function(id) {
        this.helper.n = id;
        
        return this;
    };

    /**
     * The constructor for rectangles
     *
     * @constructor
     * @param coords {Object} - coordinates of the begin pointer, e.g. {x: 100, y: 200}
     */
    var Rect = function(coords) {
        app.setIsDraw(true);
        
        this.params = {
            x : coords.x, //distance from the left edge of the image to the left side of the rectangle
            y : coords.y, //distance from the top edge of the image to the top side of the rectangle
            width : 0, //width of rectangle
            height : 0 //height of rectangle
        };
        
        this.href = ''; //href attribute - not required
        this.alt = ''; //alt attribute - not required
        this.title = ''; //title attribute - not required
    
        this.g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); //container
        this.rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); //rectangle
        app.addNodeToSvg(this.g);
        this.g.appendChild(this.rect);
        
        this.g.obj = this; /* Link to parent object */
        
        this.helpers = { //object with all helpers-rectangles
            center : new Helper(this.g, coords.x-this.params.width/2, coords.y-this.params.height/2),
            top : new Helper(this.g, coords.x-this.params.width/2, coords.y-this.params.height/2),
            bottom : new Helper(this.g, coords.x-this.params.width/2, coords.y-this.params.height/2),
            left : new Helper(this.g, coords.x-this.params.width/2, coords.y-this.params.height/2),
            right : new Helper(this.g, coords.x-this.params.width/2, coords.y-this.params.height/2),
            top_left : new Helper(this.g, coords.x-this.params.width/2, coords.y-this.params.height/2),
            top_right : new Helper(this.g, coords.x-this.params.width/2, coords.y-this.params.height/2),
            bottom_left : new Helper(this.g, coords.x-this.params.width/2, coords.y-this.params.height/2),
            bottom_right : new Helper(this.g, coords.x-this.params.width/2, coords.y-this.params.height/2)
        };
        
        this.helpers.center.setAction('move').setCursor('move');
        this.helpers.left.setAction('editLeft').setCursor('e-resize');
        this.helpers.right.setAction('editRight').setCursor('w-resize');
        this.helpers.top.setAction('editTop').setCursor('n-resize');
        this.helpers.bottom.setAction('editBottom').setCursor('s-resize');
        this.helpers.top_left.setAction('editTopLeft').setCursor('nw-resize');
        this.helpers.top_right.setAction('editTopRight').setCursor('ne-resize');
        this.helpers.bottom_left.setAction('editBottomLeft').setCursor('sw-resize');
        this.helpers.bottom_right.setAction('editBottomRight').setCursor('se-resize');
        
        this.select().redraw();
        
        /* Add this object to array of all objects */  
        app.addObject(this); 
    };
    
    Rect.prototype.setCoords = function(params){
        this.rect.setAttribute('x', params.x);
        this.rect.setAttribute('y', params.y);
        this.rect.setAttribute('width', params.width);
        this.rect.setAttribute('height', params.height);
    
        this.helpers.center.setCoords(params.x + params.width/2, params.y + params.height/2);
        this.helpers.top.setCoords(params.x + params.width/2, params.y);
        this.helpers.bottom.setCoords(params.x + params.width/2, params.y + params.height);
        this.helpers.left.setCoords(params.x, params.y + params.height/2);
        this.helpers.right.setCoords(params.x + params.width, params.y + params.height/2);
        this.helpers.top_left.setCoords(params.x, params.y);
        this.helpers.top_right.setCoords(params.x + params.width, params.y);
        this.helpers.bottom_left.setCoords(params.x, params.y + params.height);
        this.helpers.bottom_right.setCoords(params.x + params.width, params.y + params.height);
        
        return this;
    };
    
    Rect.prototype.setParams = function(params){
        this.params.x = params.x;
        this.params.y = params.y;
        this.params.width = params.width;
        this.params.height = params.height;
        
        return this;
    };
    
    Rect.prototype.redraw = function() {
        this.setCoords(this.params);
        
        return this;
    };
    
    Rect.prototype.dynamicDraw = function(x1,y1,square){
        var x0 = this.params.x,
            y0 = this.params.y,
            new_x,
            new_y,
            new_width,
            new_height,
            delta,
            temp_params;
        
        new_width = Math.abs(x1-x0);
        new_height = Math.abs(y1-y0);
        
        if (square) {
            delta = new_width-new_height;
            if (delta > 0) {
                new_width = new_height;
            } else {
                new_height = new_width;
            }
        }
    
        if (x0>x1) {
            new_x = x1;
            if (square && delta > 0) {
                new_x = x1 + Math.abs(delta);
            }
        } else {
            new_x = x0;
        }
        
        if (y0>y1) {
            new_y = y1;
            if (square && delta < 0) {
                new_y = y1 + Math.abs(delta);
            }
        } else {
            new_y = y0;
        }
        
        temp_params = { /* params */
            x : new_x,
            y : new_y,
            width : new_width,
            height: new_height
        };
        
        this.setCoords(temp_params);
        
        return temp_params;
    };
    
    Rect.prototype.onDraw = function(e) {
        var _n_f = app.getNewArea(),
            square = e.shiftKey ? true : false,
            coords = utils.getRightCoords(e.pageX, e.pageY);
            
        _n_f.dynamicDraw(coords.x, coords.y, square);
    };
    
    Rect.prototype.onDrawStop = function(e) {
        var _n_f = app.getNewArea(),
            square = e.shiftKey ? true : false,
            coords = utils.getRightCoords(e.pageX, e.pageY);
        
        _n_f.setParams(_n_f.dynamicDraw(coords.x, coords.y, square)).deselect();
        
        app.removeAllEvents()
           .setIsDraw(false)
           .resetNewArea();
    };
    
    Rect.prototype.move = function(dx, dy) { //offset x and y
        var temp_params = Object.create(this.params);
        
        temp_params.x += dx;
        temp_params.y += dy;
        
        return temp_params;
    };
    
    Rect.prototype.editLeft = function(dx, dy) { //offset x and y
        var temp_params = Object.create(this.params);
        
        temp_params.x += dx; 
        temp_params.width -= dx;
        
        return temp_params;
    };
    
    Rect.prototype.editRight = function(dx, dy) { //offset x and y
        var temp_params = Object.create(this.params);
        
        temp_params.width += dx;
        
        return temp_params;
    };
    
    Rect.prototype.editTop = function(dx, dy) { //offset x and y
        var temp_params = Object.create(this.params);
        
        temp_params.y += dy;
        temp_params.height -= dy;
        
        return temp_params;
    };
    
    Rect.prototype.editBottom = function(dx, dy) { //offset x and y
        var temp_params = Object.create(this.params);
        
        temp_params.height += dy;
        
        return temp_params;
    };
    
    Rect.prototype.editTopLeft = function(dx, dy) { //offset x and y
        var temp_params = Object.create(this.params);
        
        temp_params.x += dx;
        temp_params.y += dy;
        temp_params.width -= dx;
        temp_params.height -= dy;
        
        return temp_params;
    };
    
    Rect.prototype.editTopRight = function(dx, dy) { //offset x and y
        var temp_params = Object.create(this.params);
        
        temp_params.y += dy;
        temp_params.width += dx;
        temp_params.height -= dy;
        
        return temp_params;
    };
    
    Rect.prototype.editBottomLeft = function(dx, dy) { //offset x and y
        var temp_params = Object.create(this.params);
        
        temp_params.x += dx;
        temp_params.width -= dx;
        temp_params.height += dy;
        
        return temp_params;
    };
    
    Rect.prototype.editBottomRight = function(dx, dy) { //offset x and y
        var temp_params = Object.create(this.params);
        
        temp_params.width += dx;
        temp_params.height += dy;
        
        return temp_params;
    };
    
    Rect.prototype.dynamicEdit = function(temp_params, save_proportions) {
        if (temp_params.width < 0) {
            temp_params.width = Math.abs(temp_params.width);
            temp_params.x -= temp_params.width;
        }
        
        if (temp_params.height < 0) {
            temp_params.height = Math.abs(temp_params.height);
            temp_params.y -= temp_params.height;
        }
        
        if (save_proportions) {
            var proportions = this.params.width / this.params.height,
                new_proportions = temp_params.width / temp_params.height,
                delta = new_proportions - proportions,
                x0 = this.params.x,
                y0 = this.params.y,
                x1 = temp_params.x,
                y1 = temp_params.y;
    
            if (delta > 0) {
                temp_params.width = Math.round(temp_params.height * proportions);
            } else {
                temp_params.height = Math.round(temp_params.width / proportions);
            }
            
        }
        
        this.setCoords(temp_params);
        
        return temp_params;
    
    };
    
    Rect.prototype.onEdit = function(e) {
        var _s_f = app.getSelectedArea(),
            save_proportions = e.shiftKey,
            editType = app.getEditType();
            
        _s_f.dynamicEdit(_s_f[editType](e.pageX - _s_f.delta.x, e.pageY - _s_f.delta.y), save_proportions);
    };
    
    Rect.prototype.onEditStop = function(e) {
        var _s_f = app.getSelectedArea(),
            editType = app.getEditType(),
            save_proportions = e.shiftKey;
            
        _s_f.setParams(_s_f.dynamicEdit(_s_f[editType](e.pageX - _s_f.delta.x, e.pageY - _s_f.delta.y), save_proportions));
        app.removeAllEvents();
    };
    
    Rect.prototype.remove = function() {
        app.removeNodeFromSvg(this.g);
    };
    
    Rect.prototype.select = function() {
        this.rect.classList.add('selected');
        
        return this;
    };
    
    Rect.prototype.deselect = function() {
        this.rect.classList.remove('selected');
        
        return this;
    };
    
    Rect.prototype.with_href = function() {
        this.rect.classList.add('with_href');
        
        return this;
    };
    
    Rect.prototype.without_href = function() {
        this.rect.classList.remove('with_href');
        
        return this;
    };
    
    Rect.prototype.toString = function() { //to html map area code
        var x2 = this.params.x + this.params.width,
            y2 = this.params.y + this.params.height;
        return '<area shape="rect" coords="' // TODO: use template engine
            + this.params.x + ', '
            + this.params.y + ', '
            + x2 + ', '
            + y2
            + '"'
            + (this.href ? ' href="' + this.href + '"' : '')
            + (this.alt ? ' alt="' + this.alt + '"' : '')
            + (this.title ? ' title="' + this.title + '"' : '')
            + ' />';
    };
    
    Rect.createFromSaved = function(params) {
        var area = new Rect({
            x : params.coords[0],
            y : params.coords[1]
        });
        
        area.setParams(area.dynamicDraw(params.coords[2], params.coords[3])).deselect();
        
        app.setIsDraw(false)
           .resetNewArea();
           
        if (params.href) {
            area.href = params.href;
        }
        
        if (params.alt) {
            area.alt = params.alt;
        }
        
        if (params.title) {
            area.title = params.title;
        }
    };
    
    Rect.prototype.toJSON = function() {
        return {
            type   : 'rect',
            coords : [
                this.params.x,
                this.params.y,
                this.params.x + this.params.width,
                this.params.y + this.params.height
            ],
            href   : this.href,
            alt    : this.alt,
            title  : this.title
        };
    };
    

    /**
     * The constructor for circles
     *
     * @constructor
     * @param coords {Object} - coordinates of the begin pointer, e.g. {x: 100, y: 200}
     */
    var Circle = function (coords) {
        app.setIsDraw(true);
    
        this.params = {
            cx : coords.x, //distance from the left edge of the image to the center of the circle
            cy : coords.y, //distance from the top edge of the image to the center of the circle
            radius : 0 //radius of the circle
        };
        
        this.href = ''; //href attribute - not required
        this.alt = ''; //alt attribute - not required
        this.title = ''; //title attribute - not required
        
        this.g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        app.addNodeToSvg(this.g);
        this.g.appendChild(this.circle);
        
        this.g.obj = this; /* Link to parent object */
    
        this.helpers = { //array of all helpers-rectangles
            center : new Helper(this.g, coords.x, coords.y),
            top : new Helper(this.g, coords.x, coords.y),
            bottom : new Helper(this.g, coords.x, coords.y),
            left : new Helper(this.g, coords.x, coords.y),
            right : new Helper(this.g, coords.x, coords.y)
        };
        
        this.helpers.center.setAction('move');
        this.helpers.top.setAction('editTop').setCursor('n-resize');
        this.helpers.bottom.setAction('editBottom').setCursor('s-resize');
        this.helpers.left.setAction('editLeft').setCursor('w-resize');
        this.helpers.right.setAction('editRight').setCursor('e-resize');
    
        this.select().redraw();
        
        app.addObject(this); //add this object to array of all objects
    };
    
    Circle.prototype.setCoords = function(params){
        this.circle.setAttribute('cx', params.cx);
        this.circle.setAttribute('cy', params.cy);
        this.circle.setAttribute('r', params.radius);
    
        this.helpers.center.setCoords(params.cx, params.cy);
        this.helpers.top.setCoords(params.cx, params.cy - params.radius);
        this.helpers.right.setCoords(params.cx + params.radius, params.cy);
        this.helpers.bottom.setCoords(params.cx, params.cy + params.radius);
        this.helpers.left.setCoords(params.cx - params.radius, params.cy);
        
        return this;
    };
    
    Circle.prototype.setParams = function(params){
        this.params.cx = params.cx;
        this.params.cy = params.cy;
        this.params.radius = params.radius;
        
        return this;
    };
    
    Circle.prototype.redraw = function() {
        this.setCoords(this.params);
        
        return this;
    };
    
    Circle.prototype.dynamicDraw = function(x1,y1){
        var x0 = this.params.cx,
            y0 = this.params.cy,
            dx,
            dy,
            radius,
            temp_params;
            
        x1 = x1 ? x1 : x0;
        y1 = y1 ? y1 : y0;
            
        dx = Math.abs(x0-x1);
        dy = Math.abs(y0-y1);
        radius = Math.round(Math.sqrt(dx*dx + dy*dy));
    
        temp_params = { /* params */
            cx : x0,
            cy : y0,
            radius : radius
        };
        
        this.setCoords(temp_params);
        
        return temp_params;
    };
    
    Circle.prototype.onDraw = function(e) {
        var _n_f = app.getNewArea(),
            coords = utils.getRightCoords(e.pageX, e.pageY);
        _n_f.dynamicDraw(coords.x, coords.y);
    };
    
    Circle.prototype.onDrawStop = function(e) {
        var _n_f = app.getNewArea(),
            coords = utils.getRightCoords(e.pageX, e.pageY);
        _n_f.setParams(_n_f.dynamicDraw(coords.x, coords.y)).deselect();
    
        app.removeAllEvents()
           .setIsDraw(false)
           .resetNewArea();
    };
    
    Circle.prototype.move = function(dx, dy){ //offset x and y
        var temp_params = Object.create(this.params);
        
        temp_params.cx += dx;
        temp_params.cy += dy;
        
        return temp_params;
    };
    
    Circle.prototype.editTop = function(dx, dy){ //offset x and y
        var temp_params = Object.create(this.params);
        
        temp_params.radius -= dy;
        
        return temp_params;
    };
    
    Circle.prototype.editBottom = function(dx, dy){ //offset x and y
        var temp_params = Object.create(this.params);
        
        temp_params.radius += dy;
        
        return temp_params;
    };
    
    Circle.prototype.editLeft = function(dx, dy){ //offset x and y
        var temp_params = Object.create(this.params);
        
        temp_params.radius -= dx;
        
        return temp_params;
    };
    
    Circle.prototype.editRight = function(dx, dy){ //offset x and y
        var temp_params = Object.create(this.params);
        
        temp_params.radius += dx;
        
        return temp_params;
    };
    
    Circle.prototype.dynamicEdit = function(temp_params) {
        if (temp_params.radius < 0) {
            temp_params.radius = Math.abs(temp_params.radius);
        }
        
        this.setCoords(temp_params);
        
        return temp_params;
    };
    
    Circle.prototype.onEdit = function(e) {
        var _s_f = app.getSelectedArea(),
            editType = app.getEditType();
        
        _s_f.dynamicEdit(_s_f[editType](e.pageX - _s_f.delta.x, e.pageY - _s_f.delta.y));
    };
    
    Circle.prototype.onEditStop = function(e) {
        var _s_f = app.getSelectedArea(),
            editType = app.getEditType();
        
        _s_f.setParams(_s_f.dynamicEdit(_s_f[editType](e.pageX - _s_f.delta.x, e.pageY - _s_f.delta.y)));
        
        app.removeAllEvents();
    };
    
    Circle.prototype.remove = function(){
        app.removeNodeFromSvg(this.g);
    };
    
    Circle.prototype.select = function() {
        this.circle.classList.add('selected');
        
        return this;
    };
    
    Circle.prototype.deselect = function() {
        this.circle.classList.remove('selected');
        
        return this;
    };
    
    Circle.prototype.with_href = function() {
        this.circle.classList.add('with_href');
        
        return this;
    };
    
    Circle.prototype.without_href = function() {
        this.circle.classList.remove('with_href');
        
        return this;
    };
    
    Circle.prototype.toString = function() { //to html map area code
        return '<area shape="circle" coords="'
            + this.params.cx + ', '
            + this.params.cy + ', '
            + this.params.radius
            + '"'
            + (this.href ? ' href="' + this.href + '"' : '')
            + (this.alt ? ' alt="' + this.alt + '"' : '')
            + (this.title ? ' title="' + this.title + '"' : '')
            + ' />';
    };
    
    Circle.createFromSaved = function(params) {
        var area = new Circle({
            x : params.coords[0],
            y : params.coords[1]
        });
        
        area.setParams(area.dynamicDraw(
            params.coords[0],
            params.coords[1] + params.coords[2]
        )).deselect();
    
        app.setIsDraw(false)
           .resetNewArea();
           
        if (params.href) {
            area.href = params.href;
        }
        
        if (params.alt) {
            area.alt = params.alt;
        }
        
        if (params.title) {
            area.title = params.title;
        }
    };
    
    Circle.prototype.toJSON = function() {
        return {
            type   : 'circle',
            coords : [
                this.params.cx,
                this.params.cy,
                this.params.radius
            ],
            href   : this.href,
            alt    : this.alt,
            title  : this.title
        };
    };

    /**
     * The constructor for polygons
     *
     * @constructor
     * @param coords {Object} - coordinates of the begin pointer, e.g. {x: 100, y: 200}
     */
    var Polygon = function(coords) {
        app.setIsDraw(true);
    
        this.params = [coords.x, coords.y]; //array of coordinates of polygon points
    
        this.href = ''; //href attribute - not required
        this.alt = ''; //alt attribute - not required
        this.title = ''; //title attribute - not required
    
        this.g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        app.addNodeToSvg(this.g);
        this.g.appendChild(this.polygon);
        
        this.g.obj = this; /* Link to parent object */
    
        this.helpers = [ //array of all helpers-rectangles
            new Helper(this.g, this.params[0], this.params[1])
        ];
        
        this.helpers[0].setAction('pointMove').setCursor('pointer').setId(0);
    
        this.selected_point = -1;
        
        this.select().redraw();
    
        app.addObject(this); //add this object to array of all objects
    };

    Polygon.prototype.setCoords = function(params){
        var coords_values = params.join(' ');
        this.polygon.setAttribute('points', coords_values);
        utils.foreach(this.helpers, function(x, i) {
            x.setCoords(params[2*i], params[2*i+1]);
        });
        
        return this;
    };
    
    Polygon.prototype.setParams = function(arr) {
        this.params = Array.prototype.slice.call(arr);
    
        return this;
    };
    
    Polygon.prototype.addPoint = function(x, y){
        var helper = new Helper(this.g, x, y);
        helper.setAction('pointMove').setCursor('pointer').setId(this.helpers.length);
        this.helpers.push(helper);
        this.params.push(x, y);
        this.redraw();
        
        return this;
    };
    
    Polygon.prototype.redraw = function() {
        this.setCoords(this.params);
        
        return this;
    };
    
    Polygon.prototype.right_angle = function(x, y){
        var old_x = this.params[this.params.length-2],
            old_y = this.params[this.params.length-1],
            dx = x - old_x,
            dy = - (y - old_y),
            tan = dy/dx; //tangens
            
        if (dx > 0 && dy > 0) {
            if (tan > 2.414) {
                x = old_x;
            } else if (tan < 0.414) {
                y = old_y;
            } else {
                Math.abs(dx) > Math.abs(dy) ? x = old_x + dy : y = old_y - dx;
            }
        } else if (dx < 0 && dy > 0) {
            if (tan < -2.414) {
                x = old_x;
            } else if (tan >  -0.414) {
                y = old_y;
            } else {
                Math.abs(dx) > Math.abs(dy) ? x = old_x - dy : y = old_y + dx;
            }
        } else if (dx < 0 && dy < 0) {
            if (tan > 2.414) {
                x = old_x;
            } else if (tan < 0.414) {
                y = old_y;
            } else {
                Math.abs(dx) > Math.abs(dy) ? x = old_x + dy : y = old_y - dx;
            }
        } else if (dx > 0 && dy < 0) {
            if (tan < -2.414) {
                x = old_x;
            } else if (tan >  -0.414) {
                y = old_y;
            } else {
                Math.abs(dx) > Math.abs(dy) ? x = old_x - dy : y = old_y + dx;
            }
        }
        
        return {
            x : x,
            y : y
        };
    };
    
    Polygon.prototype.dynamicDraw = function(x, y, right_angle){
        var temp_params = [].concat(this.params);
    
        if (right_angle) {
            var right_coords = this.right_angle(x, y);
            x = right_coords.x;
            y = right_coords.y;
        }
        
        temp_params.push(x, y);
    
        this.setCoords(temp_params);
        
        return temp_params;
    };
    
    Polygon.prototype.onDraw = function(e) {
        var _n_f = app.getNewArea(),
            right_angle = e.shiftKey,
            coords = utils.getRightCoords(e.pageX, e.pageY);
            
        _n_f.dynamicDraw(coords.x, coords.y, right_angle);
    };
    
    Polygon.prototype.onDrawAddPoint = function(e) {
        var _n_f = app.getNewArea(),
            coords = utils.getRightCoords(e.pageX, e.pageY);
            
        if (e.shiftKey) {
            var right_coords = _n_f.right_angle(coords.x, coords.y);
            x = right_coords.x;
            y = right_coords.y;
        }
        _n_f.addPoint(coords.x, coords.y);
    };
    
    Polygon.prototype.onDrawStop = function(e) {
        var _n_f = app.getNewArea();
        if (e.type == 'click' || (e.type == 'keydown' && e.keyCode == 13)) { // key Enter
            if (_n_f.params.length >= 6) { //>= 3 points for polygon
                _n_f.polyline = _n_f.polygon;
                _n_f.polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                _n_f.g.replaceChild(_n_f.polygon, _n_f.polyline);
                _n_f.setCoords(_n_f.params).deselect();
                delete(_n_f.polyline);
                
                app.removeAllEvents()
                   .setIsDraw(false)
                   .resetNewArea();
            }
        }
        e.stopPropagation();
    };
    
    Polygon.prototype.move = function(x, y){ //offset x and y
        var temp_params = Object.create(this.params);
        
        for (var i = 0, count = this.params.length; i < count; i++) {
            this.params[i] += (i % 2 ? y : x);
        }
        
        return temp_params;
    };
    
    Polygon.prototype.pointMove = function(x, y){ //offset x and y
        this.params[2 * this.selected_point] += x;
        this.params[2 * this.selected_point + 1] += y;
    
        return this.params;
    };
    
    Polygon.prototype.dynamicEdit = function(temp_params) {
        this.setCoords(temp_params);
    
        return temp_params;
    };
    
    Polygon.prototype.onEdit = function(e) {
        var _s_f = app.getSelectedArea(),
            editType = app.getEditType();
        
        _s_f.dynamicEdit(_s_f[editType](e.pageX - _s_f.delta.x, e.pageY - _s_f.delta.y));
        _s_f.delta.x = e.pageX;
        _s_f.delta.y = e.pageY;
    };
    
    Polygon.prototype.onEditStop = function(e) {
        var _s_f = app.getSelectedArea(),
            editType = app.getEditType();
    
        _s_f.setParams(_s_f.dynamicEdit(_s_f[editType](e.pageX - _s_f.delta.x, e.pageY - _s_f.delta.y)));
    
        app.removeAllEvents();
    };
    
    Polygon.prototype.remove = function(){
        app.removeNodeFromSvg(this.g);
    };
    
    Polygon.prototype.select = function() {
        this.polygon.classList.add('selected');
    
        return this;
    };
    
    Polygon.prototype.deselect = function() {
        this.polygon.classList.remove('selected');
    
        return this;
    };
    
    Polygon.prototype.with_href = function() {
        this.polygon.classList.add('with_href');
    
        return this;
    };
    
    Polygon.prototype.without_href = function() {
        this.polygon.classList.remove('with_href');
    
        return this;
    };

    Polygon.prototype.toString = function() { //to html map area code
        for (var i = 0, count = this.params.length, str = ''; i < count; i++) {
            str += this.params[i];
            if (i != count - 1) {
                str += ', ';
            }
        }
        return '<area shape="poly" coords="'
            + str
            + '"'
            + (this.href ? ' href="' + this.href + '"' : '')
            + (this.alt ? ' alt="' + this.alt + '"' : '')
            + (this.title ? ' title="' + this.title + '"' : '')
            + ' />';
    };

    Polygon.createFromSaved = function(params) {
        var area = new Polygon({
            x : params.coords[0],
            y : params.coords[1]
        });

        for (var i = 2, c = params.coords.length; i < c; i+=2) {
            area.addPoint(params.coords[i], params.coords[i+1]);
        }

        area.polyline = area.polygon;
        area.polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        area.g.replaceChild(area.polygon, area.polyline);
        area.setCoords(area.params).deselect();
        delete(area.polyline);

        app.setIsDraw(false)
           .resetNewArea();

        if (params.href) {
            area.href = params.href;
        }

        if (params.alt) {
            area.alt = params.alt;
        }

        if (params.title) {
            area.title = params.title;
        }
    };

    Polygon.prototype.toJSON = function() {
        return {
            type   : 'polygon',
            coords : this.params,
            href   : this.href,
            alt    : this.alt,
            title  : this.title
        };
    };

})();
