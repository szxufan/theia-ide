/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */,
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
exports.ApiImpl = void 0;
exports.registerAPICommands = registerAPICommands;
const vscode_1 = __webpack_require__(1);
const remoteSource_1 = __webpack_require__(3);
class ApiImpl {
    _model;
    constructor(_model) {
        this._model = _model;
    }
    pickRemoteSource(options) {
        return (0, remoteSource_1.pickRemoteSource)(this._model, options);
    }
    getRemoteSourceActions(url) {
        return (0, remoteSource_1.getRemoteSourceActions)(this._model, url);
    }
    registerRemoteSourceProvider(provider) {
        return this._model.registerRemoteSourceProvider(provider);
    }
}
exports.ApiImpl = ApiImpl;
function registerAPICommands(extension) {
    const disposables = [];
    disposables.push(vscode_1.commands.registerCommand('git-base.api.getRemoteSources', (opts) => {
        if (!extension.model || !opts) {
            return;
        }
        return (0, remoteSource_1.pickRemoteSource)(extension.model, opts);
    }));
    return vscode_1.Disposable.from(...disposables);
}


/***/ }),
/* 3 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getRemoteSourceActions = getRemoteSourceActions;
exports.pickRemoteSource = pickRemoteSource;
const vscode_1 = __webpack_require__(1);
const decorators_1 = __webpack_require__(4);
async function getQuickPickResult(quickpick) {
    const listeners = [];
    const result = await new Promise(c => {
        listeners.push(quickpick.onDidAccept(() => c(quickpick.selectedItems[0])), quickpick.onDidHide(() => c(undefined)));
        quickpick.show();
    });
    quickpick.hide();
    listeners.forEach(l => l.dispose());
    return result;
}
let RemoteSourceProviderQuickPick = (() => {
    let _instanceExtraInitializers = [];
    let _onDidChangeValue_decorators;
    let _query_decorators;
    return class RemoteSourceProviderQuickPick {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _onDidChangeValue_decorators = [(0, decorators_1.debounce)(300)];
            _query_decorators = [decorators_1.throttle];
            __esDecorate(this, null, _onDidChangeValue_decorators, { kind: "method", name: "onDidChangeValue", static: false, private: false, access: { has: obj => "onDidChangeValue" in obj, get: obj => obj.onDidChangeValue }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _query_decorators, { kind: "method", name: "query", static: false, private: false, access: { has: obj => "query" in obj, get: obj => obj.query }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        provider = __runInitializers(this, _instanceExtraInitializers);
        disposables = [];
        isDisposed = false;
        quickpick;
        constructor(provider) {
            this.provider = provider;
        }
        dispose() {
            this.disposables.forEach(d => d.dispose());
            this.disposables = [];
            this.quickpick = undefined;
            this.isDisposed = true;
        }
        ensureQuickPick() {
            if (!this.quickpick) {
                this.quickpick = vscode_1.window.createQuickPick();
                this.disposables.push(this.quickpick);
                this.quickpick.ignoreFocusOut = true;
                this.disposables.push(this.quickpick.onDidHide(() => this.dispose()));
                if (this.provider.supportsQuery) {
                    this.quickpick.placeholder = this.provider.placeholder ?? vscode_1.l10n.t('Repository name (type to search)');
                    this.disposables.push(this.quickpick.onDidChangeValue(this.onDidChangeValue, this));
                }
                else {
                    this.quickpick.placeholder = this.provider.placeholder ?? vscode_1.l10n.t('Repository name');
                }
            }
        }
        onDidChangeValue() {
            this.query();
        }
        async query() {
            try {
                if (this.isDisposed) {
                    return;
                }
                this.ensureQuickPick();
                this.quickpick.busy = true;
                this.quickpick.show();
                const remoteSources = await this.provider.getRemoteSources(this.quickpick?.value) || [];
                // The user may have cancelled the picker in the meantime
                if (this.isDisposed) {
                    return;
                }
                if (remoteSources.length === 0) {
                    this.quickpick.items = [{
                            label: vscode_1.l10n.t('No remote repositories found.'),
                            alwaysShow: true
                        }];
                }
                else {
                    this.quickpick.items = remoteSources.map(remoteSource => ({
                        label: remoteSource.icon ? `$(${remoteSource.icon}) ${remoteSource.name}` : remoteSource.name,
                        description: remoteSource.description || (typeof remoteSource.url === 'string' ? remoteSource.url : remoteSource.url[0]),
                        detail: remoteSource.detail,
                        remoteSource,
                        alwaysShow: true
                    }));
                }
            }
            catch (err) {
                this.quickpick.items = [{ label: vscode_1.l10n.t('{0} Error: {1}', '$(error)', err.message), alwaysShow: true }];
                console.error(err);
            }
            finally {
                if (!this.isDisposed) {
                    this.quickpick.busy = false;
                }
            }
        }
        async pick() {
            await this.query();
            if (this.isDisposed) {
                return;
            }
            const result = await getQuickPickResult(this.quickpick);
            return result?.remoteSource;
        }
    };
})();
async function getRemoteSourceActions(model, url) {
    const providers = model.getRemoteProviders();
    const remoteSourceActions = [];
    for (const provider of providers) {
        const providerActions = await provider.getRemoteSourceActions?.(url);
        if (providerActions?.length) {
            remoteSourceActions.push(...providerActions);
        }
    }
    return remoteSourceActions;
}
async function pickRemoteSource(model, options = {}) {
    const quickpick = vscode_1.window.createQuickPick();
    quickpick.title = options.title;
    if (options.providerName) {
        const provider = model.getRemoteProviders()
            .filter(provider => provider.name === options.providerName)[0];
        if (provider) {
            return await pickProviderSource(provider, options);
        }
    }
    const remoteProviders = model.getRemoteProviders()
        .map(provider => ({ label: (provider.icon ? `$(${provider.icon}) ` : '') + (options.providerLabel ? options.providerLabel(provider) : provider.name), alwaysShow: true, provider }));
    const recentSources = [];
    if (options.showRecentSources) {
        for (const { provider } of remoteProviders) {
            const sources = (await provider.getRecentRemoteSources?.() ?? []).map((item) => {
                return {
                    ...item,
                    label: (item.icon ? `$(${item.icon}) ` : '') + item.name,
                    url: typeof item.url === 'string' ? item.url : item.url[0],
                };
            });
            recentSources.push(...sources);
        }
    }
    const items = [
        { kind: vscode_1.QuickPickItemKind.Separator, label: vscode_1.l10n.t('remote sources') },
        ...remoteProviders,
        { kind: vscode_1.QuickPickItemKind.Separator, label: vscode_1.l10n.t('recently opened') },
        ...recentSources.sort((a, b) => b.timestamp - a.timestamp)
    ];
    quickpick.placeholder = options.placeholder ?? (remoteProviders.length === 0
        ? vscode_1.l10n.t('Provide repository URL')
        : vscode_1.l10n.t('Provide repository URL or pick a repository source.'));
    const updatePicks = (value) => {
        if (value) {
            const label = (typeof options.urlLabel === 'string' ? options.urlLabel : options.urlLabel?.(value)) ?? vscode_1.l10n.t('URL');
            quickpick.items = [{
                    label: label,
                    description: value,
                    alwaysShow: true,
                    url: value
                },
                ...items
            ];
        }
        else {
            quickpick.items = items;
        }
    };
    quickpick.onDidChangeValue(updatePicks);
    updatePicks();
    const result = await getQuickPickResult(quickpick);
    if (result) {
        if (result.url) {
            return result.url;
        }
        else if (result.provider) {
            return await pickProviderSource(result.provider, options);
        }
    }
    return undefined;
}
async function pickProviderSource(provider, options = {}) {
    const quickpick = new RemoteSourceProviderQuickPick(provider);
    const remote = await quickpick.pick();
    quickpick.dispose();
    let url;
    if (remote) {
        if (typeof remote.url === 'string') {
            url = remote.url;
        }
        else if (remote.url.length > 0) {
            url = await vscode_1.window.showQuickPick(remote.url, { ignoreFocusOut: true, placeHolder: vscode_1.l10n.t('Choose a URL to clone from.') });
        }
    }
    if (!url || !options.branch) {
        return url;
    }
    if (!provider.getBranches) {
        return { url };
    }
    const branches = await provider.getBranches(url);
    if (!branches) {
        return { url };
    }
    const branch = await vscode_1.window.showQuickPick(branches, {
        placeHolder: vscode_1.l10n.t('Branch name')
    });
    if (!branch) {
        return { url };
    }
    return { url, branch };
}


/***/ }),
/* 4 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.throttle = void 0;
exports.debounce = debounce;
const util_1 = __webpack_require__(5);
function debounce(delay) {
    return decorate((fn, key) => {
        const timerKey = `$debounce$${key}`;
        return function (...args) {
            clearTimeout(this[timerKey]);
            this[timerKey] = setTimeout(() => fn.apply(this, args), delay);
        };
    });
}
exports.throttle = decorate(_throttle);
function _throttle(fn, key) {
    const currentKey = `$throttle$current$${key}`;
    const nextKey = `$throttle$next$${key}`;
    const trigger = function (...args) {
        if (this[nextKey]) {
            return this[nextKey];
        }
        if (this[currentKey]) {
            this[nextKey] = (0, util_1.done)(this[currentKey]).then(() => {
                this[nextKey] = undefined;
                return trigger.apply(this, args);
            });
            return this[nextKey];
        }
        this[currentKey] = fn.apply(this, args);
        const clear = () => this[currentKey] = undefined;
        (0, util_1.done)(this[currentKey]).then(clear, clear);
        return this[currentKey];
    };
    return trigger;
}
function decorate(decorator) {
    return function (original, context) {
        if (context.kind !== 'method') {
            throw new Error('not supported');
        }
        return decorator(original, context.name.toString());
    };
}


/***/ }),
/* 5 */
/***/ ((__unused_webpack_module, exports) => {


/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Versions = void 0;
exports.toDisposable = toDisposable;
exports.done = done;
function toDisposable(dispose) {
    return { dispose };
}
function done(promise) {
    return promise.then(() => undefined);
}
var Versions;
(function (Versions) {
    function compare(v1, v2) {
        if (typeof v1 === 'string') {
            v1 = fromString(v1);
        }
        if (typeof v2 === 'string') {
            v2 = fromString(v2);
        }
        if (v1.major > v2.major) {
            return 1;
        }
        if (v1.major < v2.major) {
            return -1;
        }
        if (v1.minor > v2.minor) {
            return 1;
        }
        if (v1.minor < v2.minor) {
            return -1;
        }
        if (v1.patch > v2.patch) {
            return 1;
        }
        if (v1.patch < v2.patch) {
            return -1;
        }
        if (v1.pre === undefined && v2.pre !== undefined) {
            return 1;
        }
        if (v1.pre !== undefined && v2.pre === undefined) {
            return -1;
        }
        if (v1.pre !== undefined && v2.pre !== undefined) {
            return v1.pre.localeCompare(v2.pre);
        }
        return 0;
    }
    Versions.compare = compare;
    function from(major, minor, patch, pre) {
        return {
            major: typeof major === 'string' ? parseInt(major, 10) : major,
            minor: typeof minor === 'string' ? parseInt(minor, 10) : minor,
            patch: patch === undefined || patch === null ? 0 : typeof patch === 'string' ? parseInt(patch, 10) : patch,
            pre: pre,
        };
    }
    Versions.from = from;
    function fromString(version) {
        const [ver, pre] = version.split('-');
        const [major, minor, patch] = ver.split('.');
        return from(major, minor, patch, pre);
    }
    Versions.fromString = fromString;
})(Versions || (exports.Versions = Versions = {}));


/***/ }),
/* 6 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GitBaseExtensionImpl = void 0;
const vscode_1 = __webpack_require__(1);
const api1_1 = __webpack_require__(2);
class GitBaseExtensionImpl {
    enabled = false;
    _onDidChangeEnablement = new vscode_1.EventEmitter();
    onDidChangeEnablement = this._onDidChangeEnablement.event;
    _model = undefined;
    set model(model) {
        this._model = model;
        const enabled = !!model;
        if (this.enabled === enabled) {
            return;
        }
        this.enabled = enabled;
        this._onDidChangeEnablement.fire(this.enabled);
    }
    get model() {
        return this._model;
    }
    constructor(model) {
        if (model) {
            this.enabled = true;
            this._model = model;
        }
    }
    getAPI(version) {
        if (!this._model) {
            throw new Error('Git model not found');
        }
        if (version !== 1) {
            throw new Error(`No API version ${version} found.`);
        }
        return new api1_1.ApiImpl(this._model);
    }
}
exports.GitBaseExtensionImpl = GitBaseExtensionImpl;


/***/ }),
/* 7 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Model = void 0;
const vscode_1 = __webpack_require__(1);
const util_1 = __webpack_require__(5);
class Model {
    remoteSourceProviders = new Set();
    _onDidAddRemoteSourceProvider = new vscode_1.EventEmitter();
    onDidAddRemoteSourceProvider = this._onDidAddRemoteSourceProvider.event;
    _onDidRemoveRemoteSourceProvider = new vscode_1.EventEmitter();
    onDidRemoveRemoteSourceProvider = this._onDidRemoveRemoteSourceProvider.event;
    registerRemoteSourceProvider(provider) {
        this.remoteSourceProviders.add(provider);
        this._onDidAddRemoteSourceProvider.fire(provider);
        return (0, util_1.toDisposable)(() => {
            this.remoteSourceProviders.delete(provider);
            this._onDidRemoveRemoteSourceProvider.fire(provider);
        });
    }
    getRemoteProviders() {
        return [...this.remoteSourceProviders.values()];
    }
}
exports.Model = Model;


/***/ }),
/* 8 */
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
exports.GitCommitFoldingProvider = void 0;
const vscode = __importStar(__webpack_require__(1));
class GitCommitFoldingProvider {
    provideFoldingRanges(document, _context, _token) {
        const ranges = [];
        let commentBlockStart;
        let currentDiffStart;
        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const lineText = line.text;
            // Check for comment lines (lines starting with #)
            if (lineText.startsWith('#')) {
                // Close any active diff block when we encounter a comment
                if (currentDiffStart !== undefined) {
                    // Only create fold if there are at least 2 lines
                    if (i - currentDiffStart > 1) {
                        ranges.push(new vscode.FoldingRange(currentDiffStart, i - 1));
                    }
                    currentDiffStart = undefined;
                }
                if (commentBlockStart === undefined) {
                    commentBlockStart = i;
                }
            }
            else {
                // End of comment block
                if (commentBlockStart !== undefined) {
                    // Only create fold if there are at least 2 lines
                    if (i - commentBlockStart > 1) {
                        ranges.push(new vscode.FoldingRange(commentBlockStart, i - 1, vscode.FoldingRangeKind.Comment));
                    }
                    commentBlockStart = undefined;
                }
            }
            // Check for diff sections (lines starting with "diff --git")
            if (lineText.startsWith('diff --git ')) {
                // If there's a previous diff block, close it
                if (currentDiffStart !== undefined) {
                    // Only create fold if there are at least 2 lines
                    if (i - currentDiffStart > 1) {
                        ranges.push(new vscode.FoldingRange(currentDiffStart, i - 1));
                    }
                }
                // Start new diff block
                currentDiffStart = i;
            }
        }
        // Handle end-of-document cases
        // If comment block extends to end of document
        if (commentBlockStart !== undefined) {
            if (document.lineCount - commentBlockStart > 1) {
                ranges.push(new vscode.FoldingRange(commentBlockStart, document.lineCount - 1, vscode.FoldingRangeKind.Comment));
            }
        }
        // If diff block extends to end of document
        if (currentDiffStart !== undefined) {
            if (document.lineCount - currentDiffStart > 1) {
                ranges.push(new vscode.FoldingRange(currentDiffStart, document.lineCount - 1));
            }
        }
        return ranges;
    }
}
exports.GitCommitFoldingProvider = GitCommitFoldingProvider;


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
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.activate = activate;
const vscode_1 = __webpack_require__(1);
const api1_1 = __webpack_require__(2);
const extension_1 = __webpack_require__(6);
const model_1 = __webpack_require__(7);
const foldingProvider_1 = __webpack_require__(8);
function activate(context) {
    const apiImpl = new extension_1.GitBaseExtensionImpl(new model_1.Model());
    context.subscriptions.push((0, api1_1.registerAPICommands)(apiImpl));
    // Register folding provider for git-commit language
    context.subscriptions.push(vscode_1.languages.registerFoldingRangeProvider('git-commit', new foldingProvider_1.GitCommitFoldingProvider()));
    return apiImpl;
}

})();

var __webpack_export_target__ = exports;
for(var __webpack_i__ in __webpack_exports__) __webpack_export_target__[__webpack_i__] = __webpack_exports__[__webpack_i__];
if(__webpack_exports__.__esModule) Object.defineProperty(__webpack_export_target__, "__esModule", { value: true });
/******/ })()
;
//# sourceMappingURL=extension.js.map