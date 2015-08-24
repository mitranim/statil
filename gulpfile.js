'use strict'

/******************************* Dependencies ********************************/

var gulp = require('gulp')
var $ = require('gulp-load-plugins')()

/*********************************** Tasks ***********************************/

gulp.task('build', function() {
  return gulp.src('src/**/*.ts')
    .pipe($.typescript({module: 'commonjs'}))
    .pipe(gulp.dest('lib'))
})

gulp.task('watch', ['build'], function() {
  $.watch('src/**/*.ts', function() {return gulp.start('build')})
})

gulp.task('default', ['watch'])
