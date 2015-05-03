/******************************* Dependencies ********************************/

import gulp from 'gulp'
import $$   from 'gulp-load-plugins'; var $ = $$()

/*********************************** Tasks ***********************************/

gulp.task('build', function() {
  return gulp.src('src/**/*.ts')
    // Proper stack printing.
    .pipe($.plumber(function(error) {
      console.log(error.stack || error.message || error)
      console.log('\x07')
    }))
    .pipe($.babel({stage: 0, modules: 'common'}))
    .pipe(gulp.dest('lib'))
})

gulp.task('watch', ['build'], function() {
  $.watch('src/**/*.ts', () => gulp.start('build'))
})

gulp.task('default', ['watch'])
