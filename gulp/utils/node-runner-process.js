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

// Forked child process for the Node.js QUnit test runner.
// Extracted from gulp-qunits NodeRunner_Process.js.
// This file is meant to be run via child_process.fork() only.

'use strict';

// Guard: only execute when forked (process.send exists).
// This file may be loaded by require-dir scanning gulp/utils/.
if (typeof process.send !== 'function') {
    module.exports = {};
} else {
    (function() {

var QUnit = require('qunitjs');

// Make the QUnit API global, like it is in the browser.
Object.keys(QUnit).forEach(function(key) {
    global[key] = QUnit[key];
});
global.QUnit = QUnit;

process.on('uncaughtException', function(err) {
    var msg = err.message,
        stack = err.stack;
    if (Array.isArray(stack)) {
        stack.forEach(function(entry) {
            msg += '\n    at ' + entry.file + ':' + entry.line;
        });
    } else if (stack) {
        msg += stack;
    }
    if (msg) {
        process.send({ type: 'error', data: msg });
    }
});

QUnit.log(function(data) {
    // Ignore passing assertions
    if (!data.result) {
        process.send({ type: 'log', data: data });
    }
});

QUnit.done(function(data) {
    process.send({ type: 'done', data: data });
});

// Require all the modules needed for the test to be present.
function requirePath(entry, addToGlobal) {
    if (typeof entry === 'string')
        entry = { path: entry };
    var exports = require(entry.path);
    if (addToGlobal) {
        if (entry.namespace) {
            global[entry.namespace] = exports;
        } else if (exports && typeof exports === 'object') {
            Object.keys(exports).forEach(function(key) {
                global[key] = exports[key];
            });
        }
    }
}

var options = JSON.parse(process.argv.pop());

(options.require || []).forEach(function(p) {
    requirePath(p, true);
});

requirePath(options.file, true);

QUnit.load();

    })();
}
