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
        
        /**
         * TODO: will use same method of app.js
         * @deprecated
         */
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
                        var Constructor = Area.CONSTRUCTORS[area_params.type],
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
                    if (x.type in Area.CONSTRUCTORS) {
                        Area.CONSTRUCTORS[x.type].createFromSaved({
                            coords : x.coords,
                            href   : x.href,
                            alt    : x.alt,
                            title  : x.title
                        });
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
                    app.onEditingProcesshape(null);
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
            REGEXP = {
                AREA : /<area(?=.*? shape="(rect|circle|poly)")(?=.*? coords="([\d ,]+?)")[\s\S]*?>/gmi,
                HREF : / href="([\S\s]+?)"/,
                ALT : / alt="([\S\s]+?)"/,
                TITLE : / title="([\S\s]+?)"/,
                DELIMETER : / ?, ?/
            };
            
        function toNumber(i) {
            return Number(coords[i]);
        }
        
        function test(str) {
            var result_area,
                result,
                type,
                coords,
                area,
                href,
                alt,
                title,
                success = false;
            
            if (str) {
                result_area = REGEXP.AREA.exec(str);
                
                while (result_area) {
                    success = true;
                    
                    area = result_area[0];
                    
                    type = result_area[1];
                    coords = result_area[2].split(REGEXP.DELIMETER);
                    
                    for (
                        var i = 0, a = ['HREF', 'ALT', 'TITLE'];
                        i < a.length;
                        i++
                    ) {
                        var name = a[i];
                        result = REGEXP[name].exec(area);
                            
                        result[name] = result ? result[1] : '';
                    }
                    
                    coords = coords.map(toNumber);
                    
                    if (x.type in Area.CONSTRUCTORS) {
                        Area.CONSTRUCTORS[x.type].createFromSaved({
                            coords : x.coords,
                            href   : x.href,
                            alt    : x.alt,
                            title  : x.title
                        });
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
    

    
    
    
    
    
    
    
    
    
    /**
     * A constructor for dom events (for simple deleting of event)
     *
     * @param {DOMElemnt} target - DOM-element
     * @param {String} eventType - e.g. 'click' or 'mousemove'
     * @param {Function} func - a handler for this event
     */
    function AppEvent(target, eventType, func) {
        this.target = target;
        this.eventType = eventType;
        this.func = func;
        
        target.addEventListener(eventType, func, false);
    }
    
    AppEvent.prototype.remove = function() {
        this.target.removeEventListener(this.eventType, this.func, false);
    };


    /**
     * The constructor of helpers points
     * 
     * @constructor
     * @param node {parentNode} - a node for inserting helper
     * @param x {number} - x - coordinate
     * @param y {number} - y - coordinate
     * @param action {string} - an action by click of this helper
     */
    function Helper(node, x, y, action) {
        this._el = document.createElementNS(Area.SVG_NS, 'rect');
        
        this._el.classList.add(Helper.CLASS_NAME);
        this._el.setAttribute('height', Helper.SIZE);
        this._el.setAttribute('width', Helper.SIZE);
        this._el.setAttribute('x', x + Helper.OFFSET);
        this._el.setAttribute('y', y + Helper.OFFSET);
        
        node.appendChild(this._el);
        
        this._el.action = action;
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
        'pointMove'       : 'pointer'
    };

    Helper.prototype.setCoords = function(x, y) {
        this._el.setAttribute('x', x + Helper.OFFSET);
        this._el.setAttribute('y', y + Helper.OFFSET);
        
        return this;
    };
    
    Helper.prototype.setId = function(id) {
        this._el.n = id;
        
        return this;
    };
    
    /**
     * The abstract constructor for area of any type
     *
     * @constructor
     * @abstract
     * @param coords {Object} - coordinates of the begin point, e.g. {x: 100, y: 200}
     */
    function Area(coords, type) {
        if (this.constructor === Area) {
            throw new Error('This is abstract class');
        }
        
        // Public properties:
        this.type = type;
        this.attributes = {
            href : '',
            alt : '',
            title : ''    
        };
        
        // Private properties:
        this._params = {};
        
        // the g-element, it contains this area and helpers elements
        this._groupEl = document.createElementNS(Area.SVG_NS, 'g');
        app.addNodeToSvg(this._groupEl);
        
        // Todo: remove this fielf from DOM-element
        /* Link to parent object */
        this._groupEl.obj = this;
        
        // svg-dom-element of area
        this._el = null; 
        
        // Array/object with all helpers of area
        this._helpers = {}; // or [] TODO сделать везде объект!!!
    }
    Area.SVG_NS = 'http://www.w3.org/2000/svg';
    Area.CLASS_NAMES = {
        SELECTED : 'selected',
        WITH_HREF : 'with_href'
    };
    Area.CONSTRUCTORS = {
        rectangle : Rectangle,
        circle : Circle,
        polygon : Polygon
    };
    
    Area.prototype.testCoords =
    Area.prototype.setCoords = function() {
        throw new Error('This is abstract method');
    };
    
    Area.prototype.redraw = function(params) {
        this.setSVGAttributes(params ? params : this._params);
        
        return this;
    };
    
    Area.prototype.remove = function() {
        app.removeNodeFromSvg(this._groupEl);
    };
    
    Area.prototype.select = function() {
        this._el.classList.add(Area.CLASS_NAMES.SELECTED);
        
        return this;
    };
    
    Area.prototype.deselect = function() {
        this._el.classList.remove(Area.CLASS_NAMES.SELECTED);
        
        return this;
    };
    
    Area.prototype.with_href = function() {
        this._el.classList.add(Area.CLASS_NAMES.WITH_HREF);
        
        return this;
    };
    
    Area.prototype.without_href = function() {
        this._el.classList.remove(Area.CLASS_NAMES.WITH_HREF);
        
        return this;
    };
    
    Area.prototype.setInfoAttributes = function(params) {
        if (params.href) {
            this.attributes.href = params.href;
        }

        if (params.alt) {
            this.attributes.alt = params.alt;
        }

        if (params.title) {
            this.attributes.title = params.title;
        }
    };
    
    Area.prototype.toJSON = function() {
        return {
            type : this._type,
            coords : this._params,
            attributes : this.attributes
        };
    };

    /**
     * The constructor for rectangles
     * 
     * Initial state:
     * (x, y) -----
     * |          |
     * -----------
     * with width = 0 and height = 0
     *
     * @constructor
     * @param coords {Object} - coordinates of the begin point, e.g. {x: 100, y: 200}
     */
    function Rectangle(coords) {
        Area.call(this, coords, 'rectangle');
        
        /**
         * @namespace
         * @property {number} x - Distance from the left edge of the image to the left side of the rectangle
         * @property {number} y - Distance from the top edge of the image to the top side of the rectangle
         * @property {number} width - Width of rectangle
         * @property {number} height - Height of rectangle
         */
        this._params = {
            x : coords.x, 
            y : coords.y,
            width : 0, 
            height : 0
        };
    
        this._el = document.createElementNS(Area.SVG_NS, 'rect');
        this._groupEl.appendChild(this._el);
        
        var x = coords.x - this._params.width / 2,
            y = coords.y - this._params.height / 2;
        
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
        
        this.select().redraw();
        
        /* Add this object to array of all objects */  
        app.addObject(this); 
    }
    utils.inherits(Rectangle, Area);
    
    /**
     * Set attributes for svg-elements of area by new parameters
     * -----top-----
     * |           |
     * ---center_y--
     * |           |
     * ---bottom----
     */
    Rectangle.prototype.setSVGAttributes = function(params){
        this._el.setAttribute('x', params.x);
        this._el.setAttribute('y', params.y);
        this._el.setAttribute('width', params.width);
        this._el.setAttribute('height', params.height);
        
        var top = params.y,
            center_y = params.y + params.height / 2,
            bottom = params.y + params.height,
            left = params.x,
            center_x = params.x + params.width / 2,
            right = params.x + params.width;
    
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
    
    Rectangle.prototype.setParams = function(params){
        this._params.x = params.x;
        this._params.y = params.y;
        this._params.width = params.width;
        this._params.height = params.height;
        
        return this;
    };
    
    Rectangle.prototype.getNormalizedCoords = function() {
        
    };
    
    Rectangle.prototype.dynamicDraw = function(x1, y1, isSquare){
        var x0 = this._params.x,
            y0 = this._params.y,
            new_x,
            new_y,
            new_width,
            new_height,
            delta,
            temp_params;
        
        new_width = Math.abs(x1 - x0);
        new_height = Math.abs(y1 - y0);
        
        if (isSquare) {
            delta = new_width-new_height;
            if (delta > 0) {
                new_width = new_height;
            } else {
                new_height = new_width;
            }
        }
    
        if (x0 > x1) {
            new_x = x1;
            if (isSquare && delta > 0) {
                new_x = x1 + Math.abs(delta);
            }
        } else {
            new_x = x0;
        }
        
        if (y0 > y1) {
            new_y = y1;
            if (isSquare && delta < 0) {
                new_y = y1 + Math.abs(delta);
            }
        } else {
            new_y = y0;
        }
        
        temp_params = {
            x : new_x,
            y : new_y,
            width : new_width,
            height: new_height
        };
        
        this.setSVGAttributes(temp_params);
        
        return temp_params;
    };
    
    Rectangle.prototype.onProcessDrawing = function(e) {
        var coords = utils.getRightCoords(e.pageX, e.pageY);
            
        this.dynamicDraw(coords.x, coords.y, e.shiftKey);
    };
    
    Rectangle.prototype.onStopDrawing = function(e) {
        var coords = utils.getRightCoords(e.pageX, e.pageY);
        
        this.setParams(this.dynamicDraw(coords.x, coords.y, e.shiftKey)).deselect();
        
        app.removeAllEvents()
           .setIsDraw(false)
           .resetNewArea();
    };
    
    /**
     * Changes area parameters by editing type and offsets
     * 
     * @param {String} editingType - A type of editing
     * @returns {Object} - Object with changed parameters of area 
     */
    Rectangle.prototype.edit = function(editingType, dx, dy) {
        var tempParams = Object.create(this._params);
        
        switch (editingType) {
            case 'move':
                tempParams.x += dx;
                tempParams.y += dy;
                break;
            
            case 'left':
                tempParams.x += dx; 
                tempParams.width -= dx;
                break;
            
            case 'right':
                tempParams.width += dx;
                break;
            
            case 'top':
                tempParams.y += dy;
                tempParams.height -= dy;
                break;
            
            case 'bottom':
                tempParams.height += dy;
                break;
               
            case 'topLeft':
                tempParams.x += dx;
                tempParams.y += dy;
                tempParams.width -= dx;
                tempParams.height -= dy;
                break;
                
            case 'topRight':
                tempParams.y += dy;
                tempParams.width += dx;
                tempParams.height -= dy;
                break;
            
            case 'bottomLeft':
                tempParams.x += dx;
                tempParams.width -= dx;
                tempParams.height += dy;
                break;
            
            case 'bottomRight':
                tempParams.width += dx;
                tempParams.height += dy;
                break;
        }
        
        return tempParams;
    };
    
    Rectangle.prototype.dynamicEdit = function(temp_params, saveProportions) {
        if (temp_params.width < 0) {
            temp_params.width = Math.abs(temp_params.width);
            temp_params.x -= temp_params.width;
        }
        
        if (temp_params.height < 0) {
            temp_params.height = Math.abs(temp_params.height);
            temp_params.y -= temp_params.height;
        }
        
        if (saveProportions) {
            var proportions = this._params.width / this._params.height,
                new_proportions = temp_params.width / temp_params.height,
                delta = new_proportions - proportions,
                x0 = this._params.x,
                y0 = this._params.y,
                x1 = temp_params.x,
                y1 = temp_params.y;
    
            if (delta > 0) {
                temp_params.width = Math.round(temp_params.height * proportions);
            } else {
                temp_params.height = Math.round(temp_params.width / proportions);
            }
            
        }
        
        this.setSVGAttributes(temp_params);
        
        return temp_params;
    };
    
    Rectangle.prototype.onProcessEditing = function(e) {
        this.dynamicEdit(
            this.edit(
                app.getEditType(),
                e.pageX - this.delta.x,
                e.pageY - this.delta.y
            ),
            e.shiftKey
        );
    };
    
    Rectangle.prototype.onStopEditing = function(e) {
        this.onProcessEditing(e);
        app.removeAllEvents();
    };
    
    Rectangle.prototype.toString = function() { //to html map area code
        var x2 = this._params.x + this._params.width,
            y2 = this._params.y + this._params.height;
            
        return '<area shape="rect" coords="' // TODO: use template engine
            + this._params.x + ', '
            + this._params.y + ', '
            + x2 + ', '
            + y2
            + '"'
            + (this.href ? ' href="' + this.href + '"' : '')
            + (this.alt ? ' alt="' + this.alt + '"' : '')
            + (this.title ? ' title="' + this.title + '"' : '')
            + ' />';
    };
    
    /**
     * Returns true if coords array is valid for rectangles and false otherwise
     *
     * @static
     * @param coords {Array} - coords for new rectangle as array
     * @return {boolean}
     */
    Rectangle.testCoords = function(coords) {
        return coords.length === 4;
    };
    
    Rectangle.createFromSaved = function(params) {
        if (!this.testCoords(params.coords)) {
            return;
        }
        
        app.setIsDraw(true);
        
        var area = new Rectangle({
            x : params.coords[0],
            y : params.coords[1]
        });
        
        area.setParams(area.dynamicDraw(params.coords[2], params.coords[3])).deselect();
        
        app.setIsDraw(false)
           .resetNewArea();
           
        area.setInfoAttributes(params);
    };
    
    Rectangle.prototype.toJSON = function() {
        return {
            type   : 'rect',
            coords : [
                this._params.x,
                this._params.y,
                this._params.x + this._params.width,
                this._params.y + this._params.height
            ],
            href   : this.href,
            alt    : this.alt,
            title  : this.title
        };
    };
    
    /**
     * Creates new rectangle and add drawing handlers for DOM-elements
     *
     * @param coords {Object} coords
     * @returns created rectangle
     */
    Rectangle.createAndStartDrawing = function(coords) {
        var newArea = new Rectangle(coords);
        
        app.addEvent(app.domElements.container, 'mousemove', newArea.onProcessDrawing.bind(newArea))
           .addEvent(app.domElements.container, 'click', newArea.onStopDrawing.bind(newArea));
           
        return newArea;
    };
    

    /**
     * The constructor for circles
     *
     * Initial state:
     *      ----
     *  /         \
     * |  (x, y)  |
     * \         /
     *    ----
     * with radius = 0
     *
     * @constructor
     * @param coords {Object} - coordinates of the begin pointer, e.g. {x: 100, y: 200}
     */
    function Circle(coords) {
        Area.call(this, coords, 'circle');
        
        /**
         * @namespace
         * @property {number} cx - Distance from the left edge of the image to the center of the circle
         * @property {number} cy - Distance from the top edge of the image to the center of the circle
         * @property {number} radius - Radius of the circle
         */
        this._params = {
            cx : coords.x,
            cy : coords.y,
            radius : 0 
        };
        
        this._el = document.createElementNS(Area.SVG_NS, 'circle');
        this._groupEl.appendChild(this._el);
    
        this.helpers = { //array of all helpers-rectangles
            center : new Helper(this._groupEl, coords.x, coords.y, 'move'),
            top : new Helper(this._groupEl, coords.x, coords.y, 'editTop'),
            bottom : new Helper(this._groupEl, coords.x, coords.y, 'editBottom'),
            left : new Helper(this._groupEl, coords.x, coords.y, 'editLeft'),
            right : new Helper(this._groupEl, coords.x, coords.y, 'editRight')
        };
    
        this.select().redraw();
        
        app.addObject(this); //add this object to array of all objects
    }
    utils.inherits(Circle, Area);
    
    Circle.prototype.setSVGAttributes = function(params){
        this._el.setAttribute('cx', params.cx);
        this._el.setAttribute('cy', params.cy);
        this._el.setAttribute('r', params.radius);
    
        this.helpers.center.setCoords(params.cx, params.cy);
        this.helpers.top.setCoords(params.cx, params.cy - params.radius);
        this.helpers.right.setCoords(params.cx + params.radius, params.cy);
        this.helpers.bottom.setCoords(params.cx, params.cy + params.radius);
        this.helpers.left.setCoords(params.cx - params.radius, params.cy);
        
        return this;
    };
    
    Circle.prototype.setParams = function(params){
        this._params.cx = params.cx;
        this._params.cy = params.cy;
        this._params.radius = params.radius;
        
        return this;
    };
    
    Circle.prototype.dynamicDraw = function(x1,y1){
        var x0 = this._params.cx,
            y0 = this._params.cy,
            dx,
            dy,
            radius,
            temp_params;
            
        x1 = x1 || x0;
        y1 = y1 || y0;
            
        dx = Math.abs(x0 - x1);
        dy = Math.abs(y0 - y1);
        radius = Math.round(Math.sqrt(dx*dx + dy*dy));
    
        temp_params = { /* params */
            cx : x0,
            cy : y0,
            radius : radius
        };
        
        this.setSVGAttributes(temp_params);
        
        return temp_params;
    };
    
    Circle.prototype.onProcessDrawing = function(e) {
        var coords = utils.getRightCoords(e.pageX, e.pageY);
        
        this.dynamicDraw(coords.x, coords.y);
    };
    
    Circle.prototype.onStopDrawing = function(e) {
        var coords = utils.getRightCoords(e.pageX, e.pageY);
        
        this.setParams(this.dynamicDraw(coords.x, coords.y)).deselect();
    
        app.removeAllEvents()
           .setIsDraw(false)
           .resetNewArea();
    };
    
    Circle.prototype.edit = function(editingType, dx, dy) {
        var tempParams = Object.create(this._params);
        
        switch (editingType) {
            case 'move':
                tempParams.cx += dx;
                tempParams.cy += dy;
                break;
                
            case 'top':
                tempParams.radius -= dy;
                break;
            
            case 'bottom':
                tempParams.radius += dy;
                break;
            
            case 'left':
                tempParams.radius -= dx;
                break;
            
            case 'right':
                tempParams.radius += dx;
                break;
        }
        
        return tempParams;
    };
    
    Circle.prototype.dynamicEdit = function(temp_params) {
        if (temp_params.radius < 0) {
            temp_params.radius = Math.abs(temp_params.radius);
        }
        
        this.setSVGAttributes(temp_params);
        
        return temp_params;
    };
    
    Circle.prototype.onProcessEditing = function(e) {
        var editType = app.getEditType();
        
        this.dynamicEdit(
            this(editType, e.pageX - this.delta.x, e.pageY - this.delta.y)
        );
    };
    
    Circle.prototype.onStopEditing = function(e) {
        var editType = app.getEditType();
        
        this.setParams(
            this.dynamicEdit(
                this.edit(editType, e.pageX - this.delta.x, e.pageY - this.delta.y)
            )
        );
        
        app.removeAllEvents();
    };
    
    Circle.prototype.toString = function() { //to html map area code
        return '<area shape="circle" coords="'
            + this._params.cx + ', '
            + this._params.cy + ', '
            + this._params.radius
            + '"'
            + (this.href ? ' href="' + this.href + '"' : '')
            + (this.alt ? ' alt="' + this.alt + '"' : '')
            + (this.title ? ' title="' + this.title + '"' : '')
            + ' />';
    };
    
    /**
     * Returns true if coords array is valid for circles and false otherwise
     *
     * @static
     * @param coords {Array} - coords for new circle as array
     * @return {boolean}
     */
    Circle.testCoords = function(coords) {
        return coords.length === 3;
    };
    
    Circle.createFromSaved = function(params) {
        if (!this.testCoords(params.coords)) {
            return;
        }
        
        app.setIsDraw(true);
        
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
           
        area.setInfoAttributes(params);
    };
    
    Circle.prototype.toJSON = function() {
        return {
            type   : 'circle',
            coords : [
                this._params.cx,
                this._params.cy,
                this._params.radius
            ],
            href   : this.href,
            alt    : this.alt,
            title  : this.title
        };
    };
    
    /**
     * Creates new circle and add drawing handlers for DOM-elements
     *
     * @param coords {Object} coords
     * @returns created circle
     */
    Circle.createAndStartDrawing = function(coords) {
        var newArea = new Circle(coords);
        
        app.addEvent(app.domElements.container, 'mousemove', newArea.onProcessDrawing.bind(newArea))
           .addEvent(app.domElements.container, 'click', newArea.onStopDrawing.bind(newArea));
           
        return newArea;
    };

    /**
     * The constructor for polygons
     *
     * Initial state:   
     *    (x, y)  
     * only one point of the line
     *
     * @constructor
     * @param coords {Object} - coordinates of the begin pointer, e.g. {x: 100, y: 200}
     */
    function Polygon(coords) {
        Area.call(this, coords, 'polygon');
        
        /**
         * @namespace
         * @property {array} points - Array of coordinates of polygon points
         */
        this._params = {
            points : [coords.x, coords.y]
        };
        
        this._el = document.createElementNS(Area.SVG_NS, 'polyline');
        this._groupEl.appendChild(this._el);
    
        this._helpers = [ //array of all helpers-rectangles
            (new Helper(this._groupEl, this._params.points[0], this._params.points[1], 'pointMove')).setId(0)
        ];
        
        this._selected_point = -1;
        
        this.select().redraw();
    
        app.addObject(this); //add this object to array of all objects
    }
    utils.inherits(Polygon, Area);

    Polygon.prototype.setSVGAttributes = function(params) {
        var coords_values = params.points.join(' ');
        
        this._el.setAttribute('points', coords_values);
        utils.foreach(this._helpers, function(helper, i) {
            helper.setCoords(params.points[2*i], params.points[2*i + 1]);
        });
        
        return this;
    };
    
    Polygon.prototype.setParams = function(arr) {
        this._params.points = Array.prototype.slice.call(arr);
    
        return this;
    };
    
    Polygon.prototype.addPoint = function(x, y){
        var helper = new Helper(this._groupEl, x, y, 'pointMove');
        helper.setId(this._helpers.length);
        this._helpers.push(helper);
        this._params.points.push(x, y);
        this.redraw();
        
        return this;
    };
    
    Polygon.prototype.right_angle = function(x, y){
        var old_x = this._params.points[this._params.points.length - 2],
            old_y = this._params.points[this._params.points.length - 1],
            dx = x - old_x,
            dy = -(y - old_y),
            tan = dy / dx; //tangens
            
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
        var temp_params = {
            points: [].concat(this._params.points)
        };
    
        if (right_angle) {
            var right_coords = this.right_angle(x, y);
            x = right_coords.x;
            y = right_coords.y;
        }
        
        temp_params.points.push(x, y);
    
        this.redraw(temp_params);
        
        return temp_params;
    };
    
    Polygon.prototype.onProcessDrawing = function(e) {
        var coords = utils.getRightCoords(e.pageX, e.pageY);
            
        this.dynamicDraw(coords.x, coords.y, e.shiftKey);
    };
    
    Polygon.prototype.onAddPointDrawing = function(e) {
        var coords = utils.getRightCoords(e.pageX, e.pageY);
            
        if (e.shiftKey) {
            coords = this.right_angle(coords.x, coords.y);
        }
        
        this.addPoint(coords.x, coords.y);
    };
    
    Polygon.prototype.onStopDrawing = function(e) {
        if (e.type == 'click' || (e.type == 'keydown' && e.keyCode == 13)) {
            if (this._params.points.length >= 6) { //>= 3 points for polygon
                this._polyline = this._el;
                this._el = document.createElementNS(Area.SVG_NS, 'polygon');
                this._groupEl.replaceChild(this._el, this._polyline);
                this.redraw(this._params).deselect();
                delete(this._polyline);
                
                app.removeAllEvents()
                   .setIsDraw(false)
                   .resetNewArea();
            }
        }
        e.stopPropagation();
    };
    
    Polygon.prototype.move = function(x, y){ //offset x and y
        var temp_params = Object.create(this._params);
        
        for (var i = 0, count = this._params.points.length; i < count; i++) {
            this._params.points[i] += (i % 2 ? y : x);
        }
        
        return temp_params;
    };
    
    Polygon.prototype.pointMove = function(x, y){ //offset x and y
        this._params.points[2 * this.selected_point] += x;
        this._params.points[2 * this.selected_point + 1] += y;
    
        return this._params;
    };
    
    Polygon.prototype.dynamicEdit = function(temp_params) {
        this.setCoords(temp_params);
    
        return temp_params;
    };
    
    Polygon.prototype.onProcessEditing = function(e) {
        var editType = app.getEditType();
        
        this.dynamicEdit(
            this.edit(editType, e.pageX - this.delta.x, e.pageY - this.delta.y)
        );
        this.delta.x = e.pageX;
        this.delta.y = e.pageY;
    };
    
    Polygon.prototype.onStopEditing = function(e) {
        var editType = app.getEditType();
    
        this.setParams(
            this.dynamicEdit(
                this.edit(editType, e.pageX - this.delta.x, e.pageY - this.delta.y)
            )
        );
    
        app.removeAllEvents();
    };
    
    Polygon.prototype.toString = function() { //to html map area code
        for (var i = 0, count = this._params.points.length, str = ''; i < count; i++) {
            str += this._params.points[i];
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
    
    /**
     * Returns true if coords array is valid for polygons and false otherwise
     *
     * @static
     * @param coords {Array} - coords for new polygon as array
     * @return {boolean}
     */
    Polygon.testCoords = function(coords) {
        return coords.length >= 6 && coords.length % 2 === 0;
    };

    Polygon.createFromSaved = function(params) {
        if (!this.testCoords(params.coords)) {
            return;
        }
        
        app.setIsDraw(true);
        
        var area = new Polygon({
            x : params.coords[0],
            y : params.coords[1]
        });

        for (var i = 2, c = params.coords.length; i < c; i += 2) {
            area.addPoint(params.coords[i], params.coords[i + 1]);
        }

        area._polyline = area._el;
        area.el = document.createElementNS(Area.SVG_NS, 'polygon');
        area._groupEl.replaceChild(area._el, area._polyline);
        area.setCoords(area._params).deselect();
        delete(area._polyline);

        app.setIsDraw(false)
           .resetNewArea();

        area.setInfoAttributes(params);
    };
    
    /**
     * Creates new polygon and add drawing handlers for DOM-elements
     *
     * @param coords {Object} coords
     * @returns created polygon
     */
    Polygon.createAndStartDrawing = function(coords) {
        var newArea = new Polygon(coords);
        
        app.addEvent(app.domElements.container, 'mousemove', newArea.onProcessDrawing.bind(newArea))
           .addEvent(app.domElements.container, 'click', newArea.onAddPointDrawing.bind(newArea))
           .addEvent(document, 'keydown', newArea.onStopDrawing.bind(newArea))
           .addEvent(newArea._helpers[0]._el, 'click', newArea.onStopDrawing.bind(newArea));
           
        return newArea;
    };

})();
