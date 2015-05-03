/******************************** Third Party ********************************/

declare module 'lodash' {
  var lodash: _.LoDashStatic
  export default lodash
}

/********************************** Custom ***********************************/

// File description in yaml metadata.
declare type Legend = {name?: string, echo?: string[]};

// Data passed to a template function.
declare type Data = {
  name?: string
  $path?: string
  $content?: string
  $title?: string
  $meta?: {}
  $?: Data
};

/*********************************** Build ***********************************/

declare module 'gulp-load-plugins' {
  var loader: Function
  export default loader
}

declare module 'gulp' {
  var gulp: gulp.Gulp
  export default gulp
}
