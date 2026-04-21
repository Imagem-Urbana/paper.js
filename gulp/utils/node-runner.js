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

// Standalone Node.js QUnit test runner, extracted from gulp-qunits NodeRunner.
// Runs QUnit tests directly in Node.js via a forked child process.

var childProcess = require('child_process');
var path = require('path');
var log = require('fancy-log');
var colors = require('ansi-colors');

var pluginName = 'paper.js (Node)';
var labelFail = colors.red('✖');
var labelPass = colors.green('✔');

function logDone(data) {
    var passed = !data.failed,
        color = passed ? colors.green : colors.red,
        label = passed ? labelPass : labelFail;
    log(pluginName + ': ' + label + ' Took ' + data.runtime + ' ms to run ' +
        colors.blue(data.total) + ' tests. ' +
        color(data.passed + ' passed, ' + data.failed + ' failed.'));
}

function logAssertion(data) {
    var passed = data.result,
        color = passed ? colors.green : colors.red,
        label = passed ? labelPass : labelFail,
        verb = passed ? 'Passed' : 'Failed';
    var lines = [
        pluginName + ': ' + label + color(' Test ' + verb.toLowerCase() + ': '),
        data.module + ': ' + colors.gray(data.name)
    ];
    var line = verb + ' assertion: ' + colors.gray(data.message || '');
    if (!passed && data.expected !== undefined) {
        line += ', expected: ' + data.expected + ', was: ' + color(data.actual);
    }
    lines.push(line);
    if (data.source) {
        var sourceLines = data.source.split(/\r\n|\n|\r/mg).map(function(l) {
            return /^\w/.test(l) ? '    at ' + l : l;
        });
        lines.push.apply(lines, sourceLines);
    }
    lines.forEach(function(l, i) {
        log(i > 0 ? '    ' + l : l);
    });
}

/**
 * Convert require paths to absolute paths relative to the test file's cwd.
 */
function convertPaths(fileCwd, paths) {
    if (!paths) return undefined;
    var res = [];
    (Array.isArray(paths) ? paths : [paths]).forEach(function(entry) {
        if (typeof entry === 'string') {
            entry = { path: entry };
        }
        entry.path = path.resolve(
            path.resolve(process.cwd(),
                /^[.]/.test(entry.path) ? fileCwd : 'node_modules'),
            entry.path
        );
        res.push(entry);
    });
    return res;
}

/**
 * Run QUnit tests in a forked Node.js process.
 * @param {object} options
 * @param {string} options.file - Path to the test load.js file
 * @param {string} options.cwd - Working directory for the test file
 * @param {Array} [options.require] - Modules to require before tests
 * @param {number} [options.timeout=40] - Timeout in seconds
 * @param {function} callback - Called with (err) on completion
 */
function run(options, callback) {
    var timeout = (options.timeout || 40) * 1000;
    var processPath = path.resolve(__dirname, 'node-runner-process.js');

    var runOptions = {
        require: convertPaths(options.cwd, options.require),
        file: options.file,
        timeout: options.timeout
    };

    log(pluginName + ': Testing ' + colors.blue(path.basename(options.file)));

    var done = false;

    function finish(err) {
        if (done) return;
        done = true;
        clearTimeout(timeoutId);
        if (child) {
            try { child.kill(); } catch(e) {}
        }
        callback(err);
    }

    var timeoutId = setTimeout(function() {
        finish('The specified timeout of ' + (timeout / 1000) +
            ' seconds has expired. Aborting...');
    }, timeout);

    var child = childProcess.fork(processPath, [JSON.stringify(runOptions)], {
        env: process.env,
        cwd: options.cwd
    });

    child.on('message', function(message) {
        switch (message.type) {
        case 'log':
            logAssertion(message.data);
            break;
        case 'done':
            logDone(message.data);
            if (message.data.failed) {
                finish(pluginName + ': ' +
                    colors.red(message.data.failed + ' assertions failed.'));
            } else {
                finish(null);
            }
            break;
        case 'error':
            finish(message.data);
            break;
        }
    });

    child.on('error', function(err) {
        finish('Node runner error: ' + (err.message || err));
    });

    child.on('exit', function(code) {
        if (code && !done) {
            finish('Node runner exited with code ' + code);
        }
    });
}

module.exports = { run: run };
