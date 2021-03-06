wickedElements.define('.nav-link', {
    onclick: function (event) {
        if (!(this.el.hasAttribute('forward')
            || !this.el.hasAttribute('href')
            || !this.el.hasAttribute('to'))) {
            event.preventDefault();
            var newEvent = new CustomEvent('route', {
                bubbles: true,
                detail: {
                    href: this.el.getAttribute('href'),
                    to: this.el.getAttribute('to'),
                    get: this.el.getAttribute('get') || this.el.getAttribute('to'),
                }
            });
            this.el.dispatchEvent(newEvent);
        }
    }
});

wickedElements.define('.route-dispatcher', {
    init: function (event) {
        this.el = event.currentTarget;
        this.views = {};
        window.addEventListener('onload', (function (event) {
            this.views[window.location.pathname] = document.cloneNode(true);
        }).bind(this));
    },
    onconnected: function (event) {
        window.onpopstate = (function (event) {
            var newEvent = new CustomEvent('route', {
                bubbles: false,
                detail: {
                    href: event.target.location.pathname,
                    to: event.state.to,
                    get: event.state.get,
                    push: false,
                }
            });
            this.el.dispatchEvent(newEvent);
        }).bind(this);
    },
    onroute: function (event) {
        var elem = this.el.querySelector(event.detail.to);
        if (elem) {
            event.preventDefault();
            var push = event.detail.push !== undefined ? event.detail.push : true;
            elem.dispatchEvent(new CustomEvent('beforeHandleRoute', {
                bubbles: false,
                detail: {
                    href: event.detail.href,
                    to: event.detail.to,
                    get: event.detail.get,
                }
            }));
            this.xhr(elem, event.detail, push);
        }
    },
    oncacheRoute: function (event) {
        event.detail.href.forEach(href => this.xhr(null, { href }, false, true));
    },
    xhr: function (elem, detail, push, cache) {
        cache = cache | false;
        if (detail.href in this.views) {
            if (!cache)
                this.dispatchEvent(elem, detail, push);
            return;
        }
        var xhr = new XMLHttpRequest();
        xhr.onload = (function (event) {
            this.views[detail.href] = event.target.response;
            if (!cache)
                this.dispatchEvent(elem, detail, push);
        }).bind(this);
        xhr.responseType = 'document';
        xhr.open('GET', detail.href);
        xhr.send();
    },
    dispatchEvent: function (elem, detail, push) {
        if (push) {
            window.history.replaceState({
                to: detail.to,
                get: detail.get,
            }, null, window.location.pathname);
            window.history.pushState({
                to: detail.to,
                get: detail.get,
            }, null, detail.href);
        }
        elem.dispatchEvent(new CustomEvent('documentLoaded', {
            bubbles: false,
            detail: {
                href: detail.href,
                to: detail.to,
                get: detail.get,
                doc: this.views[detail.href],
            }
        }));
    },
});

wickedElements.define('.route-handler', {
    init: function (event) {
        this.el = event.currentTarget;
        this.handleState = {};
    },
    onhandleRoute: function (event) {
        var path = event.detail.href;
        if (path in this.handleState && this.handleState[path].loaded) {
            this.changeContent({
                href: event.detail.href,
                to: event.detail.to,
                get: event.detail.get,
                doc: this.handleState[path].content,
            });
        } else {
            if (!this.handleState[path]) this.handleState[path] = {};
            this.handleState[path].anim = true;
        }
    },
    ondocumentLoaded: function (event) {
        var path = event.detail.href;
        if (path in this.handleState && this.handleState[path].anim) {
            this.changeContent(event.detail);
        } else {
            if (!this.handleState[path]) this.handleState[path] = {};
            this.handleState[path].loaded = true;
            this.handleState[path].content = event.detail.doc;
        }
    },
    changeContent: function (detail) {
        var newDoc = detail.doc;
        var newNode = newDoc.querySelector(detail.get);
        var oldNode = document.querySelector(detail.get);
        if (!oldNode || !newNode) return;
        var newNodeClone = newNode.cloneNode(true)
        oldNode.parentNode.replaceChild(newNodeClone, oldNode);
        var scripts = newDoc.getElementsByTagName('script');
        for (var i = 0; i < scripts.length; i++) {
            var scriptsrc = scripts[i].getAttribute('src');
            if (scriptsrc) {
                if (!document.querySelector(`script[src="${scriptsrc}"]`)) {
                    var newScript = document.createElement('script');
                    newScript.setAttribute('src', scriptsrc);
                    document.head.appendChild(newScript);
                }
            }
        }
        var meta = document.getElementsByTagName('meta');
        console.log('removing', meta.length, 'nodes');
        for (var i = meta.length-1; i >= 0; i--) {
            if (meta[i].getAttribute('name') || meta[i].getAttribute('property'))
                meta[i].parentNode.removeChild(meta[i]);
        }
        meta = newDoc.getElementsByTagName('meta');
        console.log('adding', meta.length, 'nodes');
        for (var i = 0; i < meta.length; i++) {
            if (meta[i].getAttribute('name') || meta[i].getAttribute('property'))
                document.head.appendChild(meta[i].cloneNode(true));
        }
    },
});
