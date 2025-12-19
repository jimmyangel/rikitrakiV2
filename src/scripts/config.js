import { UrlTemplateImageryProvider } from 'cesium'

export const constants = {
    CESIUM_ACCESS_TOKEN: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIwMzE3NzI4MC1kM2QxLTQ4OGItOTRmMy1jZjNiMzgyZWNjMTEiLCJpZCI6ODMxLCJpYXQiOjE1MjU5Nzg4MDN9.Aw5ul-R15-PWF1eziTS9fOffIMjm02TL0eRtOD59v2s',
    CESIUM_BASE_URL: '/Cesium/'
}


export const imageryProviders = [
    {
      provider:
        new UrlTemplateImageryProvider(
          {
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            maximumLevel: 19,
            credit: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          }
        ),
      name: 'World Imagery'
    },
    {
      provider:
        new UrlTemplateImageryProvider(
          {
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            maximumLevel: 19,
            credit: '©OpenStreetMap'
          }
        ),
      name: 'OpenStreetMap'
    },
    {
      provider:
        new UrlTemplateImageryProvider(
          {
            url: 'https://services.arcgisonline.com/arcgis/rest/services/USA_Topo_Maps/MapServer/tile/{z}/{y}/{x}',
            maximumLevel: 15,
            credit: 'Esri, DeLorme, FAO, USGS, NOAA, EPA | © 2013 National Geographic Society, i-cubed'
          }
        ),
      name: 'USA Topo Maps'
    }
]
