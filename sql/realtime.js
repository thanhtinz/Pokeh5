/**
 * Realtime transport.
 *
 * The game was written against socket.io and calls socket.emit()/socket.on()
 * from about twenty places in data.js, npm.js and style/js2.php. Rather than
 * rewrite those call sites, this file exposes the same two methods and moves
 * the traffic onto Server-Sent Events for the downstream and ordinary POSTs
 * for the upstream:
 *
 *   socket.emit(name, ...args)  ->  POST realtime/publish.php
 *   socket.on(name, handler)    ->  EventSource realtime/stream.php
 *
 * EventSource reconnects by itself and resumes from the last id it saw, so
 * there is no connection state to manage here.
 *
 * Server payloads are objects. Two keys are unwrapped before a handler is
 * called, so that handlers keep receiving exactly what socket.io gave them:
 *
 *   {raw: "..."}    the handler is called with the string  (chatall, chat)
 *   {value: x}      the handler is called with x           (online, pvp_moi)
 *
 * Anything else is passed through as the object it is (nguoichoi, datachat).
 */
var socket = (function () {
    var STREAM_URL = '/realtime/stream.php';
    var PUBLISH_URL = '/realtime/publish.php';

    var handlers = {};
    var source = null;
    var bound = {};
    var reopenTimer = null;

    function dispatch(name, payload) {
        var list = handlers[name];
        if (!list || !list.length) {
            return;
        }

        var value = payload;
        if (payload && typeof payload === 'object') {
            if (Object.prototype.hasOwnProperty.call(payload, 'raw')) {
                value = payload.raw;
            } else if (Object.prototype.hasOwnProperty.call(payload, 'value')) {
                value = payload.value;
            }
        }

        for (var i = 0; i < list.length; i++) {
            try {
                list[i](value);
            } catch (e) {
                // One bad handler must not stop the others, and must not kill
                // the stream.
                if (window.console && console.error) {
                    console.error('realtime handler for "' + name + '" failed', e);
                }
            }
        }
    }

    /** Attach the EventSource listener for an event name, once. */
    function bind(name) {
        if (bound[name] || !source) {
            return;
        }

        bound[name] = true;
        source.addEventListener(name, function (e) {
            var payload = null;
            try {
                payload = e.data ? JSON.parse(e.data) : null;
            } catch (err) {
                payload = e.data;
            }

            dispatch(name, payload);
        });
    }

    function open() {
        if (source) {
            return;
        }

        source = new EventSource(STREAM_URL);

        // The server closes each stream after ~30s to free the PHP worker.
        // EventSource reopens on its own after an error, but a clean close
        // arrives as onerror with readyState CLOSED, so reopen explicitly.
        source.onerror = function () {
            if (source && source.readyState === EventSource.CLOSED) {
                close();

                if (reopenTimer === null) {
                    reopenTimer = window.setTimeout(function () {
                        reopenTimer = null;
                        open();
                    }, 1000);
                }
            }
        };

        source.addEventListener('unauthorised', function () {
            // Not logged in yet; stop retrying until emit() is called again.
            close();
        });

        for (var name in handlers) {
            if (Object.prototype.hasOwnProperty.call(handlers, name)) {
                bind(name);
            }
        }
    }

    function close() {
        if (source) {
            source.close();
            source = null;
            bound = {};
        }
    }

    return {
        /** Register a handler, matching socket.on(). */
        on: function (name, handler) {
            if (!handlers[name]) {
                handlers[name] = [];
            }
            handlers[name].push(handler);

            if (source) {
                bind(name);
            }

            return this;
        },

        /** Send an event, matching socket.emit(name, ...args). */
        emit: function (name) {
            var args = Array.prototype.slice.call(arguments, 1);

            var body = {
                event: name,
                args: args
            };

            // Map-scoped events are filtered server-side; mapID is the
            // client's current map, set by the game as the player walks.
            if (typeof mapID !== 'undefined') {
                body.map = mapID;
            }

            open();

            return fetch(PUBLISH_URL, {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            }).catch(function (e) {
                if (window.console && console.warn) {
                    console.warn('realtime emit "' + name + '" failed', e);
                }
            });
        },

        /** Kept for parity with socket.io; the game calls neither. */
        connect: function () {
            open();
            return this;
        },

        disconnect: function () {
            close();
            return this;
        }
    };
})();

/**
 * socket.io exposed a global io() factory. Some inline scripts still call
 * io.connect(...); returning the shim keeps those working.
 */
var io = {
    connect: function () {
        return socket;
    }
};
