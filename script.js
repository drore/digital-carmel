(function() {
    var map;
    var layers = {};
    var slider;

    function init() {
        map.on('load', onMapLoaded);
        slider = document.getElementById('slider');
        slider.addEventListener('input', event => {
            filterBy(event.target.value);
        })
    }

    var hideLayer = function(layerName) {
        map.setLayoutProperty(layerName, 'visibility', 'none');
        map.setLayoutProperty(layerName + '-event-circles', 'visibility', 'none');
        map.setLayoutProperty(layerName + '-event-labels', 'visibility', 'none');
        layers[layerName].visible = false;
    }

    var toggleLayer = function(layerName) {
        if (layers[layerName].visible) {
            hideLayer(layerName);
        } else {
            // Remove all layers
            Object.keys(layers).forEach(key => {
                hideLayer(key);
            })

            map.setLayoutProperty(layerName, 'visibility', 'visible');
            map.setLayoutProperty(layerName + '-event-circles', 'visibility', 'visible');
            map.setLayoutProperty(layerName + '-event-labels', 'visibility', 'visible');
            layers[layerName].visible = true;



            currentVisibleLayerName = layerName;
            updateSlider(layerName);
        }
    }

    function updateSlider(layerName) {
        let values = document.getElementById('values');
        const layerObj = layers[layerName];
        if (layerObj) {
            if (layerObj.min && layerObj.max) {
                slider.setAttribute('min', layerObj.min);
                slider.setAttribute('max', layerObj.max);

                const interval = (layerObj.max - layerObj.min) / 10;

                let html = [];
                html.push(`<div>${layerObj.min}</div>`)
                for (var i = 0; i < 8; i++) {
                    html.push(`<div>${parseInt(layerObj.min + (interval * i))}</div>`)
                }
                html.push(`<div>${layerObj.max}</div>`)

                values.innerHTML = html.join('');
            } else {
                values.innerHTML = ''
            }

        }
    }

    function initMap(data, layerObj) {
        const layerName = layerObj.name;
        const layerColor = layerObj.color;
        const visibility = layerObj.shown ? 'visible' : 'none';
        map.on('click', layerName, onMapClicked);

        map.addSource(layerName, {
            'type': 'geojson',
            'data': data
        });

        map.addLayer({
            'id': layerName,
            'type': 'circle',
            'source': layerName,
            'layout': {
                'visibility': visibility
            },
            'paint': {
                'circle-color': layerColor,
                'circle-opacity': 0,
                'circle-radius': 30
            }
        });

        map.addLayer({
            'id': `${layerName}-event-circles`,
            'type': 'circle',
            'source': layerName,
            'layout': {
                'visibility': visibility
            },
            'paint': {
                'circle-color': layerColor,
                'circle-opacity': 1,
            }
        });

        map.addLayer({
            'id': `${layerName}-event-labels`,
            'type': 'symbol',
            'source': layerName,
            'layout': {
                'text-field': ['concat', ['to-string', ['get', 'title_reverse']]],
                'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                'text-size': 20,
                'visibility': visibility
            },
            'paint': {
                'text-color': 'rgba(0,0,0,0.5)'
            }
        });

        layerObj.visible = layerObj.shown
        layers[layerName] = layerObj;
        if (visibility) {
            setCurrentLayer(layerName);
        }
    }

    function setCurrentLayer(layerName) {
        currentVisibleLayerName = layerName;
    }

    function filterBy(value) {

        var filters = ['all', ['>=', 'start', +value - 10],
            ['<=', 'start', +value + 10]
        ];

        map.setFilter(`${currentVisibleLayerName}-event-circles`, filters);
        map.setFilter(`${currentVisibleLayerName}-event-labels`, filters);
    }

    var fillToggler = function(layerObjs) {
        const togglerElement = document.getElementById('layer-toggler-inner');
        if (togglerElement) {
            let html = [];
            layerObjs.forEach(layerObj => {
                html.push(`<div><input type="checkbox" ${layerObj.shown?'checked':''} class="toggler" name="${layerObj.name}"/><label for="${layerObj.name}">${layerObj.title}</label></div>`);
            })

            togglerElement.innerHTML = html.join('');
            togglerElement.addEventListener('mouseup', e => {
                e.preventDefault();
                e.stopPropagation();
                const layerName = e.target.name;
                if (layers[layerName]) {
                    toggleLayer(layerName);
                }
            })
        }
    }

    function loadData() {
        const layerObjs = [{
            name: "archiology",
            url: "archiology.json",
            color: 'green',
            title: "סקר ארכיאולוגי",
            fields: ['link'],
            link_title: "קישור לאתר רשות העתיקות"
        }, {
            name: "collective_memory",
            url: "collective_memory.json",
            color: 'blue',
            title: "זכרון קולקטיבי",
            fields: ['informant', 'place_name', 'start', 'imageURL', 'imageTitle', 'link']
        }, {
            name: "elijah",
            url: "elijah.json",
            color: 'orange',
            title: "מעבדת אליהו",
            fields: ['place_name', 'source', 'category', 'link', 'content']
        }, {
            name: "achtia",
            url: "achtia.json",
            color: 'red',
            fields: ['link'],
            title: "אח'טיה"
        }, {
            name: "gilad",
            url: "gilad.json",
            color: 'purple',
            fields: ['imageURL'],
            title: "אתר ארכיאולוגי חוף דור"
        }]
        var promises = [];

        layerObjs.forEach(layerObj => {
            promises.push(fetch(layerObj.url));
        })

        Promise.all(promises).then(responses => {
            responses.forEach((response, i) => {
                if (response.status !== 200) {
                    console.log('Looks like there was a problem. Status Code: ' +
                        response.status);
                    return;
                }

                // Examine the text in the response
                response.json().then(function(data) {
                    loadDataIntoMap(data, layerObjs[i]);
                });
            });

            fillToggler(layerObjs);
        }).catch(err => console.error(err));
    }

    function onMapClicked(e) {
        var item = e.features[0];

        var coordinates = item.geometry.coordinates.slice();
        var title = item.properties.title;
        var imageURL = item.properties.imageURL;
        var link = item.properties.link;
        var fields = layers[currentVisibleLayerName].fields;

        var html = [];
        html.push('<div>');
        html.push(`<h3>${title}</h3>`);
        fields.forEach(field => {
            if (field === 'container_start') {
                html.push(`<div>`);
            } else if (field === 'imageURL') {
                if (imageURL) {
                    html.push(`<div><img style="width:100%" src="${imageURL}" /></div>`);
                }

            } else if (field === 'link') {
                if (link) {
                    const link_title = item.properties['link_title'] || 'קישור';
                    html.push(`<div><a href="${link}" target="_blank">${link_title}</a></div>`);
                }

            } else {
                if (item.properties[field]) {
                    html.push(`<div>${item.properties[field]}</div>`)
                }

            }
        })



        html.push('</div>');

        var html = html.join('');

        // Ensure that if the map is zoomed out such that multiple
        // copies of the feature are visible, the popup appears
        // over the copy being pointed to.
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setHTML(html)
            .addTo(map);
    }

    var reverseString = function(str) {
        // Step 1. Use the split() method to return a new array
        var splitString = str.split(""); // var splitString = "hello".split("");
        // ["h", "e", "l", "l", "o"]

        // Step 2. Use the reverse() method to reverse the new created array
        var reverseArray = splitString.reverse(); // var reverseArray = ["h", "e", "l", "l", "o"].reverse();
        // ["o", "l", "l", "e", "h"]

        // Step 3. Use the join() method to join all elements of the array into a string
        var joinArray = reverseArray.join(""); // var joinArray = ["o", "l", "l", "e", "h"].join("");
        // "olleh"

        //Step 4. Return the reversed string
        return joinArray; // "olleh"
    }

    var minMax = function(items) {
        return items.reduce((acc, val) => {
            acc[0] = (acc[0] === undefined || val.start < acc[0]) ? val.start : acc[0]
            acc[1] = (acc[1] === undefined || val.start > acc[1]) ? val.start : acc[1]
            return acc;
        }, []);
    }

    var extractDates = function(data) {
        return minMax(data);
    }

    var loadDataIntoMap = function(data, layerObj) {
        let geoJSON = {
            "type": "FeatureCollection",
            "features": [

            ]
        };

        if (data[0].start) {
            const minMax = extractDates(data);
            layerObj.min = minMax[0];
            layerObj.max = minMax[1];
        }


        geoJSON.features = data.map(item => {
            var properties = {};

            Object.keys(item).forEach(key => {
                if (key) {
                    var value = item[key];
                    properties[key] = value;
                    if (key === 'title') {
                        properties['title_reverse'] = reverseString(value);
                    }
                }
            })

            return {
                "type": "Feature",
                "properties": properties,
                "geometry": {
                    "type": "Point",
                    "coordinates": [
                        item.lan, item.lat
                    ]
                }
            }
        })

        initMap(geoJSON, layerObj);
    }

    var onMapLoaded = function() {
        loadData();
    }

    mapboxgl.accessToken = 'pk.eyJ1IjoiZGhoYWlmYSIsImEiOiJjam0wdTJ3MXEyYnR0M3BxeHd2MDUzbWw0In0.x_fzlHpecq3A0hDIdtjabA';
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/light-v9',
        center: [34.9918, 32.7919],
        zoom: 13
    });


    //dhhaifa.18pn9y2d
    init();
})()