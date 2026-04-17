/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2020, Jürg Lehni & Jonathan Puckey
 * http://juerglehni.com/ & https://puckey.studio/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

var gulp = require('gulp'),
    path = require('path'),
    webserver = require('gulp-webserver'),
    playwrightRunner = require('../utils/playwright-runner'),
    nodeRunner = require('../utils/node-runner');

gulp.task('test', ['test:playwright', 'test:node']);

gulp.task('test:playwright', ['minify:acorn'], function(callback) {
    // Start a local web server, run Playwright tests, then stop.
    var stream = gulp.src('.')
        .pipe(webserver({
            host: '0.0.0.0',
            port: 8001,
            open: false
        }));
    playwrightRunner.run({
        url: 'http://127.0.0.1:8001/test',
        checkGlobals: true,
        timeout: 120
    }, function(err) {
        stream.emit('kill');
        callback(err);
    });
});

gulp.task('test:node', ['minify:acorn'], function(callback) {
    var testCwd = path.resolve('test');
    nodeRunner.run({
        file: path.resolve(testCwd, 'load.js'),
        cwd: testCwd,
        require: [
            // To dynamically load the tests files from the sources, we need
            // to require Prepro.js first.
            'prepro/lib/node.js',
            // Note that loading dist/paper-full.js also works in
            // combination with `gulp load`, in which case Prepro.js is
            // present and handles the loading transparently.
            { path: '../dist/paper-full.js', namespace: 'paper' }
        ],
        timeout: 40
    }, callback);
});

gulp.task('test:browser', ['minify:acorn'], function() {
    gulp.src('.')
        .pipe(webserver({
            host: '0.0.0.0', // Bind to all interfaces for Docker access
            port: 8000,
            open: '/test'
        }));
});

