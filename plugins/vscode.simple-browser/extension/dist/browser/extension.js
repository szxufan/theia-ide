/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.activate = activate;
const vscode = __importStar(__webpack_require__(1));
const simpleBrowserManager_1 = __webpack_require__(2);
const simpleBrowserView_1 = __webpack_require__(3);
const openApiCommand = 'simpleBrowser.api.open';
const showCommand = 'simpleBrowser.show';
const enabledHosts = new Set([
    'localhost',
    // localhost IPv4
    '127.0.0.1',
    // localhost IPv6
    '[0:0:0:0:0:0:0:1]',
    '[::1]',
    // all interfaces IPv4
    '0.0.0.0',
    // all interfaces IPv6
    '[0:0:0:0:0:0:0:0]',
    '[::]'
]);
const openerId = 'simpleBrowser.open';
function activate(context) {
    const manager = new simpleBrowserManager_1.SimpleBrowserManager(context.extensionUri);
    context.subscriptions.push(manager);
    context.subscriptions.push(vscode.window.registerWebviewPanelSerializer(simpleBrowserView_1.SimpleBrowserView.viewType, {
        deserializeWebviewPanel: async (panel, state) => {
            manager.restore(panel, state);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand(showCommand, async (url) => {
        if (!url) {
            url = await vscode.window.showInputBox({
                placeHolder: vscode.l10n.t("https://example.com"),
                prompt: vscode.l10n.t("Enter url to visit")
            });
        }
        if (url) {
            manager.show(url);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand(openApiCommand, (url, showOptions) => {
        manager.show(url, showOptions);
    }));
    context.subscriptions.push(vscode.window.registerExternalUriOpener(openerId, {
        canOpenExternalUri(uri) {
            // We have to replace the IPv6 hosts with IPv4 because URL can't handle IPv6.
            const originalUri = new URL(uri.toString(true));
            if (enabledHosts.has(originalUri.hostname)) {
                return isWeb()
                    ? vscode.ExternalUriOpenerPriority.Default
                    : vscode.ExternalUriOpenerPriority.Option;
            }
            return vscode.ExternalUriOpenerPriority.None;
        },
        openExternalUri(resolveUri) {
            return manager.show(resolveUri, {
                viewColumn: vscode.window.activeTextEditor ? vscode.ViewColumn.Beside : vscode.ViewColumn.Active
            });
        }
    }, {
        schemes: ['http', 'https'],
        label: vscode.l10n.t("Open in simple browser"),
    }));
}
function isWeb() {
    return !(typeof process === 'object' && !!process.versions.node) && vscode.env.uiKind === vscode.UIKind.Web;
}


/***/ }),
/* 1 */
/***/ ((module) => {

module.exports = require("vscode");

/***/ }),
/* 2 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SimpleBrowserManager = void 0;
const simpleBrowserView_1 = __webpack_require__(3);
class SimpleBrowserManager {
    extensionUri;
    _activeView;
    constructor(extensionUri) {
        this.extensionUri = extensionUri;
    }
    dispose() {
        this._activeView?.dispose();
        this._activeView = undefined;
    }
    show(inputUri, options) {
        const url = typeof inputUri === 'string' ? inputUri : inputUri.toString(true);
        if (this._activeView) {
            this._activeView.show(url, options);
        }
        else {
            const view = simpleBrowserView_1.SimpleBrowserView.create(this.extensionUri, url, options);
            this.registerWebviewListeners(view);
            this._activeView = view;
        }
    }
    restore(panel, state) {
        const url = state?.url ?? '';
        const view = simpleBrowserView_1.SimpleBrowserView.restore(this.extensionUri, url, panel);
        this.registerWebviewListeners(view);
        this._activeView ??= view;
    }
    registerWebviewListeners(view) {
        view.onDispose(() => {
            if (this._activeView === view) {
                this._activeView = undefined;
            }
        });
    }
}
exports.SimpleBrowserManager = SimpleBrowserManager;


/***/ }),
/* 3 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SimpleBrowserView = void 0;
const vscode = __importStar(__webpack_require__(1));
const dispose_1 = __webpack_require__(4);
const uuid_1 = __webpack_require__(5);
class SimpleBrowserView extends dispose_1.Disposable {
    extensionUri;
    static viewType = 'simpleBrowser.view';
    static title = vscode.l10n.t("Simple Browser");
    static getWebviewLocalResourceRoots(extensionUri) {
        return [
            vscode.Uri.joinPath(extensionUri, 'media')
        ];
    }
    static getWebviewOptions(extensionUri) {
        return {
            enableScripts: true,
            enableForms: true,
            localResourceRoots: SimpleBrowserView.getWebviewLocalResourceRoots(extensionUri),
        };
    }
    _webviewPanel;
    _onDidDispose = this._register(new vscode.EventEmitter());
    onDispose = this._onDidDispose.event;
    static create(extensionUri, url, showOptions) {
        const webview = vscode.window.createWebviewPanel(SimpleBrowserView.viewType, SimpleBrowserView.title, {
            viewColumn: showOptions?.viewColumn ?? vscode.ViewColumn.Active,
            preserveFocus: showOptions?.preserveFocus
        }, {
            retainContextWhenHidden: true,
            ...SimpleBrowserView.getWebviewOptions(extensionUri)
        });
        return new SimpleBrowserView(extensionUri, url, webview);
    }
    static restore(extensionUri, url, webviewPanel) {
        return new SimpleBrowserView(extensionUri, url, webviewPanel);
    }
    constructor(extensionUri, url, webviewPanel) {
        super();
        this.extensionUri = extensionUri;
        this._webviewPanel = this._register(webviewPanel);
        this._webviewPanel.webview.options = SimpleBrowserView.getWebviewOptions(extensionUri);
        this._register(this._webviewPanel.webview.onDidReceiveMessage(e => {
            switch (e.type) {
                case 'openExternal':
                    try {
                        const url = vscode.Uri.parse(e.url);
                        vscode.env.openExternal(url);
                    }
                    catch {
                        // Noop
                    }
                    break;
            }
        }));
        this._register(this._webviewPanel.onDidDispose(() => {
            this.dispose();
        }));
        this._register(vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('simpleBrowser.focusLockIndicator.enabled')) {
                const configuration = vscode.workspace.getConfiguration('simpleBrowser');
                this._webviewPanel.webview.postMessage({
                    type: 'didChangeFocusLockIndicatorEnabled',
                    focusLockEnabled: configuration.get('focusLockIndicator.enabled', true)
                });
            }
        }));
        this.show(url);
    }
    dispose() {
        this._onDidDispose.fire();
        super.dispose();
    }
    show(url, options) {
        this._webviewPanel.webview.html = this.getHtml(url);
        this._webviewPanel.reveal(options?.viewColumn, options?.preserveFocus);
    }
    getHtml(url) {
        const configuration = vscode.workspace.getConfiguration('simpleBrowser');
        const nonce = (0, uuid_1.generateUuid)();
        const mainJs = this.extensionResourceUrl('media', 'index.js');
        const mainCss = this.extensionResourceUrl('media', 'main.css');
        const codiconsUri = this.extensionResourceUrl('media', 'codicon.css');
        return /* html */ `<!DOCTYPE html>
			<html>
			<head>
				<meta http-equiv="Content-type" content="text/html;charset=UTF-8">

				<meta http-equiv="Content-Security-Policy" content="
					default-src 'none';
					font-src data:;
					style-src ${this._webviewPanel.webview.cspSource};
					script-src 'nonce-${nonce}';
					frame-src *;
					">

				<meta id="simple-browser-settings" data-settings="${escapeAttribute(JSON.stringify({
            url: url,
            focusLockEnabled: configuration.get('focusLockIndicator.enabled', true)
        }))}">

				<link rel="stylesheet" type="text/css" href="${mainCss}">
				<link rel="stylesheet" type="text/css" href="${codiconsUri}">
			</head>
			<body>
				<header class="header">
					<nav class="controls">
						<button
							title="${vscode.l10n.t("Back")}"
							class="back-button icon"><i class="codicon codicon-arrow-left"></i></button>

						<button
							title="${vscode.l10n.t("Forward")}"
							class="forward-button icon"><i class="codicon codicon-arrow-right"></i></button>

						<button
							title="${vscode.l10n.t("Reload")}"
							class="reload-button icon"><i class="codicon codicon-refresh"></i></button>
					</nav>

					<input class="url-input" type="text">

					<nav class="controls">
						<button
							title="${vscode.l10n.t("Open in browser")}"
							class="open-external-button icon"><i class="codicon codicon-link-external"></i></button>
					</nav>
				</header>
				<div class="content">
					<div class="iframe-focused-alert">${vscode.l10n.t("Focus Lock")}</div>
					<iframe sandbox="allow-scripts allow-forms allow-same-origin allow-downloads"></iframe>
				</div>

				<script src="${mainJs}" nonce="${nonce}"></script>
			</body>
			</html>`;
    }
    extensionResourceUrl(...parts) {
        return this._webviewPanel.webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, ...parts));
    }
}
exports.SimpleBrowserView = SimpleBrowserView;
function escapeAttribute(value) {
    return value.toString().replace(/"/g, '&quot;');
}


/***/ }),
/* 4 */
/***/ ((__unused_webpack_module, exports) => {


/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Disposable = void 0;
exports.disposeAll = disposeAll;
function disposeAll(disposables) {
    while (disposables.length) {
        const item = disposables.pop();
        item?.dispose();
    }
}
class Disposable {
    _isDisposed = false;
    _disposables = [];
    dispose() {
        if (this._isDisposed) {
            return;
        }
        this._isDisposed = true;
        disposeAll(this._disposables);
    }
    _register(value) {
        if (this._isDisposed) {
            value.dispose();
        }
        else {
            this._disposables.push(value);
        }
        return value;
    }
    get isDisposed() {
        return this._isDisposed;
    }
}
exports.Disposable = Disposable;


/***/ }),
/* 5 */
/***/ ((__unused_webpack_module, exports) => {


/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.generateUuid = generateUuid;
/**
 * Copied from src/vs/base/common/uuid.ts
 */
function generateUuid() {
    // use `randomUUID` if possible
    if (typeof crypto.randomUUID === 'function') {
        // see https://developer.mozilla.org/en-US/docs/Web/API/Window/crypto
        // > Although crypto is available on all windows, the returned Crypto object only has one
        // > usable feature in insecure contexts: the getRandomValues() method.
        // > In general, you should use this API only in secure contexts.
        return crypto.randomUUID.bind(crypto)();
    }
    // prep-work
    const _data = new Uint8Array(16);
    const _hex = [];
    for (let i = 0; i < 256; i++) {
        _hex.push(i.toString(16).padStart(2, '0'));
    }
    // get data
    crypto.getRandomValues(_data);
    // set version bits
    _data[6] = (_data[6] & 0x0f) | 0x40;
    _data[8] = (_data[8] & 0x3f) | 0x80;
    // print as string
    let i = 0;
    let result = '';
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += '-';
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += '-';
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += '-';
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += '-';
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    return result;
}


/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(0);
/******/ 	var __webpack_export_target__ = exports;
/******/ 	for(var __webpack_i__ in __webpack_exports__) __webpack_export_target__[__webpack_i__] = __webpack_exports__[__webpack_i__];
/******/ 	if(__webpack_exports__.__esModule) Object.defineProperty(__webpack_export_target__, "__esModule", { value: true });
/******/ 	
/******/ })()
;
//# sourceMappingURL=extension.js.map