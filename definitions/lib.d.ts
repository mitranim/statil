/******************************** Third Party ********************************/

declare module 'lodash' {
  var lodash: _.LoDashStatic
  export default lodash
}

/*********************************** Build ***********************************/

declare module 'gulp-load-plugins' {
  var loader: Function
  export default loader
}

declare module 'gulp' {
  var gulp: gulp.Gulp
  export default gulp
}
