import { UrlTemplateImageryProvider } from 'cesium'

export const constants = {
    CESIUM_ACCESS_TOKEN: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIwMzE3NzI4MC1kM2QxLTQ4OGItOTRmMy1jZjNiMzgyZWNjMTEiLCJpZCI6ODMxLCJpYXQiOjE1MjU5Nzg4MDN9.Aw5ul-R15-PWF1eziTS9fOffIMjm02TL0eRtOD59v2s',
    CESIUM_BASE_URL: '/Cesium/',
    APIV2_BASE_URL: 'https://ycuzyqqrab.execute-api.us-west-2.amazonaws.com/Prod',
    S3_BASE_URL: 'https://rikitraki.s3.us-west-2.amazonaws.com',

    TRAIL_MARKER_COLOR: '7A5C1E',
    WAYPOINT_COLOR: '#3887BE',
    TRACK_COLOR: '#8D6E27',
    INSIDE_TRACK_COLOR: '#EBEB00',
    SELECTED_THUMBNAIL_COLOR: '#00FF00',

    FAVORITE: '&#10029;',

    KEYCODE_ESC: 27,
    KEYCODE_SPACE: 32,

    CAMERA_OFFSET: 6000,
    FLY_TIME: 2,

    MIN_SAMPLE_DISTANCE: 10,
    AUTOPLAY_DELAY: 5000
}

export const site = {
  title: 'RikiTraki',
  description: 'Welcome to RikiTraki, a GPS track sharing site. Use a map or a globe to explore our outdoor experiences and learn more about their locations.',
  keywords: ['maps','hiking','biking','travel','cesiumjs','gps','gpx','geospatial','terrain maps','rikitraki','outdoor navigation'],
  image: '/images/og/rikitraki-og.jpg',
  mastodon: 'https://fosstodon.org/@jimmyangel'
}