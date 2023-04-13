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
import IVisualHost = powerbi.extensibility.IVisualHost;
import { default as H } from '@here/maps-api-for-javascript/bin/mapsjs.bundle.harp.js';


export class Visual implements IVisual {
  private host: IVisualHost;
  private container: HTMLElement;
  private apiKey: string;
  private platform: H.service.Platform;
  private mapTypes: Object;
  private map: Object;
  private engineType: H.Map.EngineType;

  constructor(options: VisualConstructorOptions) {
    // options.element holds the DOM element in which the visuals component will be instantiated
    this.container = options.element;
    this.apiKey = 'API_KEY';
    this.engineType = H.Map.EngineType.HARP;

    // Create and setup the DOM element hosting the map
    const element = <HTMLInputElement>document.createElement('div');
    element.id = 'mapContainer';
    element.style.width = '100%';
    element.style.height = '100%';
    this.container.append(element);

    this.platform = new H.service.Platform({apikey: this.apiKey});

    // TODO: probably unnecessary to create all the default layers
    this.mapTypes = this.platform.createDefaultLayers({
      tileSize: 256,
      engineType: this.engineType
    });

    this.map = new H.Map(
      element,
      (this.mapTypes as any).vector.normal.map, {
        zoom: 5,
        center: {lat: 52.5189, lng: 13.4158}, // Berlin
        engineType: this.engineType,
        renderBaseBackground: {
          lower: 2,
          higher: 2
        },
        pixelRatio: 1
      }
    );

    // TODO: check why it doesn't show up
    H.ui.UI.createDefault(this.map, this.mapTypes, 'en-US');
    new H.mapevents.Behavior(new H.mapevents.MapEvents(this.map))
  }

  // On visuals update handler
  public update(options: VisualUpdateOptions) {
    /** @ts-ignore */
    this.map.getViewPort().resize();
  }
}
