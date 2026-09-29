import React, { useEffect, useRef, useState } from 'react';

import 'ol/ol.css';

import Map from 'ol/Map';
import View from 'ol/View';

import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';

import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import VectorSource from 'ol/source/Vector';

import GeoJSON from 'ol/format/GeoJSON';

import Draw from 'ol/interaction/Draw';

import { Style, Stroke, Fill } from 'ol/style';

import { transformExtent } from 'ol/proj';

import { getLength } from 'ol/sphere';


// =====================================================
// BHOOMISETU STYLES
// =====================================================

// Cadastral parcels
const parcelStyle = new Style({
    stroke: new Stroke({
        color: 'rgba(107, 114, 128, 0.5)',
        width: 1
    }),

    fill: new Fill({
        color: 'rgba(243, 244, 246, 0.1)'
    })
});


// Affected parcels
const affectedStyle = new Style({
    stroke: new Stroke({
        color: '#EF4444',
        width: 2
    }),

    fill: new Fill({
        color: 'rgba(239, 68, 68, 0.2)'
    })
});


// Existing project geometry
const projectStyle = new Style({
    stroke: new Stroke({
        color: '#3B82F6',
        width: 3,
        lineDash: [10, 10]
    }),

    fill: new Fill({
        color: 'rgba(59, 130, 246, 0.1)'
    })
});


// Risk parcels
const riskStyle = new Style({
    stroke: new Stroke({
        color: '#F59E0B',
        width: 2
    }),

    fill: new Fill({
        color: 'rgba(245, 158, 11, 0.4)'
    })
});


// =====================================================
// HIGHWAY DRAWING STYLE
// =====================================================

const highwayDrawStyle = new Style({
    stroke: new Stroke({
        color: '#2563EB',
        width: 4,
        lineDash: [12, 8]
    })
});


// =====================================================
// MAP COMPONENT
// =====================================================

export default function MapContainer({
    parcels,
    projects,
    affectedParcels,
    riskParcels,

    onParcelSelect,
    isDrawing,
    onDrawingComplete,

    layersVisible = {
        cadastral: true,
        project: true,
        affected: true,
        risk: true
    }
}) {

    // =================================================
    // MAP REFERENCES
    // =================================================

    const mapRef = useRef(null);
    const mapInstance = useRef(null);

    const [mapReady, setMapReady] = useState(false);


    // =================================================
    // DATA SOURCES
    // =================================================

    // Existing/general drawing source
    const vectorSourceRef = useRef(
        new VectorSource()
    );


    // Cadastral parcels
    const parcelSourceRef = useRef(
        new VectorSource()
    );


    // Existing project geometry
    const projectSourceRef = useRef(
        new VectorSource()
    );


    // Affected parcels
    const affectedSourceRef = useRef(
        new VectorSource()
    );


    // Risk parcels
    const riskSourceRef = useRef(
        new VectorSource()
    );


    // =================================================
    // HIGHWAY DRAW INTERACTION
    // =================================================

    const drawInteractionRef = useRef(null);


    // =================================================
    // KEEP LATEST CALLBACKS
    // =================================================

    const onParcelSelectRef = useRef(
        onParcelSelect
    );

    const onDrawingCompleteRef = useRef(
        onDrawingComplete
    );


    useEffect(() => {

        onParcelSelectRef.current =
            onParcelSelect;

    }, [onParcelSelect]);


    useEffect(() => {

        onDrawingCompleteRef.current =
            onDrawingComplete;

    }, [onDrawingComplete]);


    // =================================================
    // LAYERS
    // =================================================

    const parcelLayerRef = useRef(
        new VectorLayer({
            source: parcelSourceRef.current,
            style: parcelStyle,
            zIndex: 1
        })
    );


    const affectedLayerRef = useRef(
        new VectorLayer({
            source: affectedSourceRef.current,
            style: affectedStyle,
            zIndex: 2
        })
    );


    const projectLayerRef = useRef(
        new VectorLayer({
            source: projectSourceRef.current,
            style: projectStyle,
            zIndex: 3
        })
    );


    const riskLayerRef = useRef(
        new VectorLayer({
            source: riskSourceRef.current,
            style: riskStyle,
            zIndex: 4
        })
    );


    // =================================================
    // HIGHWAY DRAW LAYER
    // =================================================

    const highwayDrawLayerRef = useRef(
        new VectorLayer({
            source: vectorSourceRef.current,
            style: highwayDrawStyle,
            zIndex: 10
        })
    );


    // =================================================
    // INITIALIZE MAP
    // =================================================

    useEffect(() => {

        if (
            !mapRef.current ||
            mapInstance.current
        ) {
            return;
        }


        // ---------------------------------------------
        // ASSAM EXTENT
        // ---------------------------------------------

        const assamExtent = transformExtent(
            [
                89.68,
                24.13,
                96.01,
                27.97
            ],

            'EPSG:4326',
            'EPSG:3857'
        );


        // ---------------------------------------------
        // CREATE MAP
        // ---------------------------------------------

        const map = new Map({

            target: mapRef.current,

            layers: [

                // -------------------------------------
                // SATELLITE BASEMAP
                // -------------------------------------

                new TileLayer({

                    source: new XYZ({

                        url:
                            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',

                        maxZoom: 19

                    })

                }),


                // -------------------------------------
                // OSM OVERLAY
                // -------------------------------------

                new TileLayer({

                    source: new OSM(),

                    opacity: 0.4

                }),


                // -------------------------------------
                // GIS DATA LAYERS
                // -------------------------------------

                parcelLayerRef.current,

                affectedLayerRef.current,

                projectLayerRef.current,

                riskLayerRef.current,


                // -------------------------------------
                // HIGHWAY DRAWING LAYER
                // -------------------------------------

                highwayDrawLayerRef.current

            ],


            // -----------------------------------------
            // MAP VIEW
            // -----------------------------------------

            view: new View({

                center: [
                    10214697,
                    2983792
                ],

                zoom: 12,

                extent: assamExtent,

                minZoom: 6

            })

        });


        // =================================================
        // PARCEL CLICK
        // =================================================

        map.on('click', (event) => {

            /*
             * Don't select parcels while drawing
             */

            if (drawInteractionRef.current) {
                return;
            }


            const features =
                map.getFeaturesAtPixel(
                    event.pixel
                );


            if (
                !features ||
                features.length === 0
            ) {

                if (
                    onParcelSelectRef.current
                ) {

                    onParcelSelectRef.current(
                        null
                    );

                }

                return;
            }


            /*
             * Find a cadastral parcel
             */

            const parcelFeature =
                features.find(
                    (feature) =>
                        feature.get('ulpin') ||
                        feature.get('dagNo') ||
                        feature.get('id')
                );


            if (
                parcelFeature &&
                onParcelSelectRef.current
            ) {

                onParcelSelectRef.current(
                    parcelFeature.getProperties()
                );

            }

        });


        // Save map instance
        mapInstance.current = map;

        setMapReady(true);


        // =================================================
        // CLEANUP
        // =================================================

        return () => {

            map.setTarget(null);

            mapInstance.current = null;

        };

    }, []);


    // =====================================================
    // HIGHWAY DRAWING
    // =====================================================

    useEffect(() => {

        if (!mapInstance.current) {
            return;
        }


        const map =
            mapInstance.current;


        // =================================================
        // REMOVE OLD DRAW INTERACTION
        // =================================================

        if (drawInteractionRef.current) {

            map.removeInteraction(
                drawInteractionRef.current
            );

            drawInteractionRef.current = null;

        }


        // =================================================
        // DRAWING MODE OFF
        // =================================================

        if (!isDrawing) {
            return;
        }


        // =================================================
        // CLEAR PREVIOUS HIGHWAY
        // =================================================

        vectorSourceRef.current.clear();


        // =================================================
        // CREATE HIGHWAY DRAW INTERACTION
        // =================================================

        const draw = new Draw({

            source:
                vectorSourceRef.current,

            /*
             * IMPORTANT:
             *
             * Highway = LineString
             *
             * NOT Polygon
             */

            type: 'LineString',


            /*
             * Normal mode:
             *
             * Click → add point
             *
             * Double-click → finish
             *
             *
             * Freehand mode:
             *
             * Hold SHIFT + drag
             */

            freehandCondition: (event) => {

                return event.originalEvent.shiftKey;

            },

            /*
             * Prevent accidental very short lines
             */

            minPoints: 2,

            /*
             * Allow as many points as required
             */

            maxPoints: undefined

        });


        // =================================================
        // DRAW COMPLETE
        // =================================================

        draw.on(
            'drawend',
            (event) => {

                const feature =
                    event.feature;


                // -----------------------------------------
                // GET GEOMETRY
                // -----------------------------------------

                const geometry =
                    feature.getGeometry();


                // -----------------------------------------
                // CALCULATE LENGTH
                // -----------------------------------------

                const lengthInMeters =
                    getLength(
                        geometry
                    );


                const lengthInKm =
                    lengthInMeters / 1000;


                // -----------------------------------------
                // CONVERT TO GEOJSON
                // -----------------------------------------

                const format =
                    new GeoJSON();


                const geojson =
                    format.writeFeatureObject(
                        feature,
                        {

                            featureProjection:
                                'EPSG:3857',

                            dataProjection:
                                'EPSG:4326',

                            decimals: 6

                        }
                    );


                // -----------------------------------------
                // ADD BHOOMISETU INFORMATION
                // -----------------------------------------

                geojson.properties = {

                    geometryType:
                        'HIGHWAY_ALIGNMENT',

                    lengthMeters:
                        Math.round(
                            lengthInMeters
                        ),

                    lengthKm:
                        Number(
                            lengthInKm.toFixed(3)
                        )

                };


                // -----------------------------------------
                // DEBUG
                // -----------------------------------------

                console.log(
                    '================================'
                );

                console.log(
                    'BHOOMISETU HIGHWAY CREATED'
                );

                console.log(
                    'Length:',
                    lengthInKm.toFixed(3),
                    'km'
                );

                console.log(
                    'GeoJSON:',
                    geojson
                );

                console.log(
                    '================================'
                );


                // -----------------------------------------
                // SEND TO GIS.JSX
                // -----------------------------------------

                if (
                    onDrawingCompleteRef.current
                ) {

                    onDrawingCompleteRef.current(
                        geojson
                    );

                }

            }
        );


        // =================================================
        // ADD DRAW INTERACTION
        // =================================================

        map.addInteraction(draw);

        drawInteractionRef.current =
            draw;


        // =================================================
        // CLEANUP
        // =================================================

        return () => {

            if (
                mapInstance.current &&
                drawInteractionRef.current
            ) {

                mapInstance.current.removeInteraction(
                    drawInteractionRef.current
                );

                drawInteractionRef.current = null;

            }

        };

    }, [isDrawing]);


    // =====================================================
    // UPDATE PARCELS / PROJECTS / AFFECTED / RISK
    // =====================================================

    useEffect(() => {

        if (!mapReady) {
            return;
        }


        const format =
            new GeoJSON();


        // =================================================
        // CADASTRAL PARCELS
        // =================================================

        parcelSourceRef.current.clear();


        if (
            parcels?.features &&
            parcels.features.length > 0
        ) {

            const features =
                format.readFeatures(
                    parcels,
                    {

                        featureProjection:
                            'EPSG:3857',

                        dataProjection:
                            'EPSG:4326'

                    }
                );


            parcelSourceRef.current.addFeatures(
                features
            );

        }


        // =================================================
        // PROJECTS
        // =================================================

        projectSourceRef.current.clear();


        if (
            projects?.features &&
            projects.features.length > 0
        ) {

            const features =
                format.readFeatures(
                    projects,
                    {

                        featureProjection:
                            'EPSG:3857',

                        dataProjection:
                            'EPSG:4326'

                    }
                );


            projectSourceRef.current.addFeatures(
                features
            );

        }


        // =================================================
        // AFFECTED PARCELS
        // =================================================

        affectedSourceRef.current.clear();


        if (
            affectedParcels?.features &&
            affectedParcels.features.length > 0
        ) {

            const features =
                format.readFeatures(
                    affectedParcels,
                    {

                        featureProjection:
                            'EPSG:3857',

                        dataProjection:
                            'EPSG:4326'

                    }
                );


            affectedSourceRef.current.addFeatures(
                features
            );

        }


        // =================================================
        // RISK PARCELS
        // =================================================

        riskSourceRef.current.clear();


        if (
            riskParcels?.features &&
            riskParcels.features.length > 0
        ) {

            const features =
                format.readFeatures(
                    riskParcels,
                    {

                        featureProjection:
                            'EPSG:3857',

                        dataProjection:
                            'EPSG:4326'

                    }
                );


            riskSourceRef.current.addFeatures(
                features
            );

        }

    }, [
        parcels,
        projects,
        affectedParcels,
        riskParcels,
        mapReady
    ]);


    // =====================================================
    // LAYER VISIBILITY
    // =====================================================

    useEffect(() => {

        if (!mapReady) {
            return;
        }


        parcelLayerRef.current.setVisible(
            layersVisible.cadastral !== false
        );


        projectLayerRef.current.setVisible(
            layersVisible.project !== false
        );


        affectedLayerRef.current.setVisible(
            layersVisible.affected !== false
        );


        riskLayerRef.current.setVisible(
            layersVisible.risk !== false
        );

    }, [
        layersVisible,
        mapReady
    ]);


    // =====================================================
    // RENDER
    // =====================================================

    return (

        <div
            ref={mapRef}

            style={{
                width: '100%',
                height: '100%',
                minHeight: '500px',
                background: '#e5e5e5'
            }}
        />

    );

}