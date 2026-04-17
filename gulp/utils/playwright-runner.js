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

// Playwright-based QUnit test runner for browser tests.
// Replaces the PhantomJS runner from gulp-qunits.

var chromium = require('playwright').chromium;
var path = require('path');
var fs = require('fs');
var log = require('fancy-log');
var colors = require('ansi-colors');

var pluginName = 'paper.js (Playwright)';
var labelFail = colors.red('✖');
var labelPass = colors.green('✔');

var RESULTS_DIR = path.resolve(process.cwd(), 'test-results');

function escapeXml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function writeJUnitReport(suiteName, assertions, summary) {
    var failures = assertions.filter(function(a) { return !a.result; });
    var lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<testsuites>',
        '  <testsuite name="' + escapeXml(suiteName) + '"' +
            ' tests="' + summary.total + '"' +
            ' failures="' + summary.failed + '"' +
            ' time="' + (summary.runtime / 1000).toFixed(3) + '">',
    ];

    // Group assertions by module+name into test cases
    var testCases = {};
    assertions.forEach(function(a) {
        var key = (a.module || '') + '::' + (a.name || '');
        if (!testCases[key]) {
            testCases[key] = { module: a.module, name: a.name, failures: [] };
        }
        if (!a.result) {
            testCases[key].failures.push(a);
        }
    });

    Object.keys(testCases).forEach(function(key) {
        var tc = testCases[key];
        lines.push('    <testcase classname="' + escapeXml(tc.module || 'Unknown') +
            '" name="' + escapeXml(tc.name || 'Unknown') + '">');
        tc.failures.forEach(function(f) {
            var msg = f.message || '';
            if (f.expected !== undefined) {
                msg += ' (expected: ' + f.expected + ', was: ' + f.actual + ')';
            }
            lines.push('      <failure message="' + escapeXml(msg) + '">');
            if (f.source) {
                lines.push('        ' + escapeXml(f.source));
            }
            lines.push('      </failure>');
        });
        lines.push('    </testcase>');
    });

    lines.push('  </testsuite>');
    lines.push('</testsuites>');

    if (!fs.existsSync(RESULTS_DIR)) {
        fs.mkdirSync(RESULTS_DIR, { recursive: true });
    }
    var outFile = path.join(RESULTS_DIR, 'playwright-results.xml');
    fs.writeFileSync(outFile, lines.join('\n'), 'utf8');
    log(pluginName + ': Test report written to ' + outFile);
}

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
 * Run QUnit tests in a Playwright Chromium browser.
 * @param {object} options
 * @param {string} options.url - URL to open (e.g. http://localhost:8000/test)
 * @param {number} [options.timeout=40] - Timeout in seconds
 * @param {boolean} [options.checkGlobals=false] - Append ?noglobals to URL
 * @param {function} callback - Called with (err) on completion
 */
function run(options, callback) {
    var timeout = (options.timeout || 40) * 1000;
    var url = options.url;
    if (options.checkGlobals) {
        url += (url.indexOf('?') === -1 ? '?' : '&') + 'noglobals';
    }

    log(pluginName + ': Testing ' + colors.blue(url));

    var browser, done = false;
    var assertions = [];

    function finish(err) {
        if (done) return;
        done = true;
        clearTimeout(timeoutId);
        if (browser) {
            browser.close().then(function() {
                callback(err);
            }).catch(function() {
                callback(err);
            });
        } else {
            callback(err);
        }
    }

    var timeoutId = setTimeout(function() {
        finish('The specified timeout of ' + (timeout / 1000) +
            ' seconds has expired. Aborting...');
    }, timeout);

    chromium.launch({ headless: true }).then(function(b) {
        browser = b;
        return browser.newPage();
    }).then(function(page) {
        // Expose functions for QUnit to call back into Node.js
        return page.exposeFunction('__playwrightLog', function(dataJson) {
            var data = JSON.parse(dataJson);
            assertions.push(data);
            logAssertion(data);
        }).then(function() {
            return page.exposeFunction('__playwrightDone', function(dataJson) {
                var data = JSON.parse(dataJson);
                logDone(data);
                try {
                    writeJUnitReport(pluginName, assertions, data);
                } catch (e) {
                    log(pluginName + ': Failed to write JUnit report: ' + e.message);
                }
                if (data.failed) {
                    finish(pluginName + ': ' +
                        colors.red(data.failed + ' assertions failed.'));
                } else {
                    finish(null);
                }
            });
        }).then(function() {
            return page.exposeFunction('__playwrightError', function(msg) {
                finish(msg);
            });
        }).then(function() {
            // Inject QUnit hooks after DOM is loaded
            return page.addInitScript(function() {
                document.addEventListener('DOMContentLoaded', function() {
                    if (!window.QUnit) {
                        window.__playwrightError(
                            'QUnit does not appear to be loaded.');
                        return;
                    }
                    QUnit.log(function(data) {
                        window.__playwrightLog(JSON.stringify(data));
                    });
                    QUnit.done(function(data) {
                        window.__playwrightDone(JSON.stringify(data));
                    });
                }, false);
            });
        }).then(function() {
            // Listen for page errors
            page.on('pageerror', function(err) {
                finish('Page error: ' + err.message);
            });
            // Listen for console messages
            page.on('console', function(msg) {
                log('Browser console [' + msg.type() + ']: ' + msg.text());
            });
            return page.goto(url, { waitUntil: 'load', timeout: timeout });
        });
    }).catch(function(err) {
        finish('Playwright error: ' + (err.message || err));
    });
}

module.exports = { run: run };
