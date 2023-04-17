/*
 *  Power BI Visual CLI
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

"use strict";

import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import DataView = powerbi.DataView;
import DataViewSingle = powerbi.DataViewSingle;
import PrimitiveValue = powerbi.PrimitiveValue;
import DataViewValueColumnGroup = powerbi.DataViewValueColumnGroup;
import DataViewCategorical = powerbi.DataViewCategorical;
import IVisualHost = powerbi.extensibility.IVisualHost;
import { default as H } from "@here/maps-api-for-javascript/bin/mapsjs.bundle.harp.js";

/**
 *  The following code was written merely as proof of concept for the HERE Maps JS API integration in Power BI and
 *  It expects to work only with "US Sales Analysis" report available at
 *  https://microsoft.github.io/PowerBI-visuals/docs/step-by-step-lab/images/US_Sales_Analysis.pbix
 */
export class Visual implements IVisual {
  private host: IVisualHost;
  private container: HTMLElement;
  private apiKey: string;
  private platform: H.service.Platform;
  private mapTypes: Object;
  private map: H.Map;
  private engineType: H.Map.EngineType;
  private infoBubble: Object;
  private highlitedObject: H.Map.Polygon;
  private isGeoJSONloaded: boolean = false;


  /**
   * Fetches and renders the GeoJSON correspoding to the provided country iso code from the GitHub resource below
   * @param country_isocode the 2 digit country iso code
   */
  showGeoJSONData(country_isocode) {
    const url = `https://raw.githubusercontent.com/scdoshi/us-geojson/master/geojson/state/${country_isocode}.geojson`;
    // Create GeoJSON reader which will download the specified file.
    // Shape of the file was obtained by using HERE Geocoder API.
    var reader = new H.data.geojson.Reader(url, {
      disableLegacyMode: true,
    });

    const stateHandler = (evt) => {
      if (reader.getState() === H.data.AbstractReader.State.READY) {
        const object = reader.getParsedObjects()[0];
        object.setVolatility(true);
        object.setData(country_isocode);
        reader.removeEventHandler(stateHandler);
      }
    };

    reader.addEventListener("statechange", stateHandler);

    // Start parsing the file
    reader.parse();

    // Add layer which shows GeoJSON data on the map
    this.map.addLayer(reader.getLayer());
  }

  constructor(options: VisualConstructorOptions) {
    // options.element holds the DOM element in which the visuals component will be instantiated
    this.container = options.element;
    this.apiKey = "YOUR-APIKEY-HERE";
    this.engineType = H.Map.EngineType.HARP;

    document.body.style.width = "100%";
    document.body.style.height = "100%";
    document.body.style.position = "absolute";
    document.body.style.overflow = "hidden";

    const cssLink = <HTMLLinkElement>document.createElement("link");
    cssLink.rel = "stylesheet";
    cssLink.type = "text/css";
    cssLink.href = "https://js.api.here.com/v3/3.1/mapsjs-ui.css";
    document.head.appendChild(cssLink);

    // Create and setup the DOM element hosting the map
    const element = <HTMLInputElement>document.createElement("div");
    element.id = "mapContainer";
    element.style.width = "100%";
    element.style.height = "100%";
    this.container.append(element);

    this.platform = new H.service.Platform({ apikey: this.apiKey });

    // TODO: probably unnecessary to create all the default layers
    this.mapTypes = this.platform.createDefaultLayers({
      tileSize: 512,
      engineType: this.engineType,
      ppi: 320
    });

    const baseLayer = (this.mapTypes as any).raster.normal.map;

    this.map = new H.Map(element, baseLayer, {
      zoom: 4,
      center: { lat: 52.5189, lng: 13.4158 }, // Berlin
      engineType: this.engineType,
      renderBaseBackground: {
        lower: 2,
        higher: 2,
      },
      pixelRatio: 2,
    });

    const ui = H.ui.UI.createDefault(this.map, this.mapTypes, "en-US");
    new H.mapevents.Behavior(new H.mapevents.MapEvents(this.map));

    this.map.addEventListener("tap", (evt) => {
      const x = evt.currentPointer.viewportX;
      const y = evt.currentPointer.viewportY;
      const coords = this.map.screenToGeo(x, y);
      if (evt.target instanceof H.map.Polygon) {

        if (this.highlitedObject) {
          // Reset style for the current highlited polygon
          this.highlitedObject.setStyle();
        }

        const mapObject = evt.target;
        this.highlitedObject = mapObject;
        const infoBubbleContent = `<div>${mapObject.getData()}</div>`;

        if (this.infoBubble) {
          (this.infoBubble as any).close();
          (this.infoBubble as any).setPosition(coords);
          (this.infoBubble as any).setContent(infoBubbleContent);
          (this.infoBubble as any).open();
        } else {
          this.infoBubble = new H.ui.InfoBubble(coords, {
            content: infoBubbleContent,
          });
          ui.addBubble(this.infoBubble);
        }

        mapObject.setStyle({
          fillColor: "rgba(255, 0, 0, 0.5)",
          strokeColor: "rgba(0, 0, 255, 0.2)",
          lineWidth: 3,
        });
      }
    });
  }

  // On visuals update handler
  public update(options: VisualUpdateOptions) {
    console.log("[UPDATE]");

    // You should expect to the see the following code working exclusively with the "State > State Code" data
    // from the "US Sales Analysis" report - see class descripion above for the link.
    if (options.dataViews && options.dataViews.length) {
      const dataView: DataView = options.dataViews[0];
      const categoricalDataView: DataViewCategorical = dataView.categorical;

      if (!categoricalDataView || !categoricalDataView.categories) {
        console.log(categoricalDataView, categoricalDataView.categories);
        return;
      }

      const categories: PrimitiveValue[] =
        categoricalDataView.categories[0].values;
      if (!this.isGeoJSONloaded) {
        categories.forEach((cat) => {
          this.showGeoJSONData(cat);
          this.isGeoJSONloaded = true;
        });
      }
    }
    /** @ts-ignore */
    this.map.getViewPort().resize();
  }

  // TODO: dispose map
  public destroy(): void {
    //one time cleanup code goes here (called once)
  }
}
