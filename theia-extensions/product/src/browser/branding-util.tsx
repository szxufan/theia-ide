/********************************************************************************
 * Copyright (C) 2020 EclipseSource and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 *
 * SPDX-License-Identifier: MIT
 ********************************************************************************/

import { codicon } from '@theia/core/lib/browser';
import { WindowService } from '@theia/core/lib/browser/window/window-service';
import { environment } from '@theia/core/lib/common';
import * as React from 'react';
import { getBrandingVariant } from './theia-ide-config';

export interface ExternalBrowserLinkProps {
    text: string;
    url: string;
    windowService: WindowService;
}

export function renderProductName(): React.ReactNode {
    const variant = getBrandingVariant();
    const suffix = variant !== 'stable' ? ` ${variant.charAt(0).toUpperCase() + variant.slice(1)}` : '';
    return <h1>Eclipse Theia <span className="tide-branding-accent">IDE</span>{suffix}</h1>;
}

export const DOWNLOAD_URL = 'https://theia-ide.org/#theiaidedownload';

function BrowserLink(props: ExternalBrowserLinkProps): React.JSX.Element {
    return <a
        role={'button'}
        tabIndex={0}
        href={props.url}
        target='_blank'
    >
        {props.text}
    </a>;
}

/*
 * The sections below are shared by the welcome page and the About dialog, so that both describe the product
 * in the same words. Keep them to a sentence or two each: the welcome page has to stay scannable.
 */

export function renderWhatIs(windowService: WindowService): React.ReactNode {
    return <div className='gs-section'>
        <h3 className='gs-section-header'>
            <i className={codicon('info')}></i>
            这是什么？
        </h3>
        <div>
            Eclipse Theia IDE 是一款面向云端与桌面的现代开放 IDE，构建于
            <BrowserLink text="Theia 平台" url="https://theia-ide.org" windowService={windowService} /> 之上。
        </div>
        <div>
            您可以获取 <BrowserLink text="桌面应用程序" url={DOWNLOAD_URL} windowService={windowService} />，也可以 <BrowserLink
                text="在线试用最新版本" url="https://try.theia-cloud.io/" windowService={windowService} />。在线版本每次会话限
            30 分钟，托管于 <BrowserLink text="Theia Cloud" url="https://theia-cloud.io/" windowService={windowService} />。
        </div>
    </div>;
}

export function renderExtendingCustomizing(windowService: WindowService): React.ReactNode {
    return <div className='gs-section'>
        <h3 className='gs-section-header'>
            <i className={codicon('extensions')}></i>
            扩展与定制
        </h3>
        <div>
            您可以通过从开放的插件市场 <BrowserLink text="Open VSX registry" url="https://open-vsx.org/" windowService={windowService} /> 安装
            VS Code 扩展，在运行时扩展 IDE。打开扩展视图即可浏览。
        </div>
        <div>
            本 IDE 构建于灵活的 Theia 平台之上，因此也可作为您自有工具和 IDE 的
            <span className='gs-text-bold'>模板</span>。请参阅
            <BrowserLink text="文档" url="https://theia-ide.org/docs/composing_applications/" windowService={windowService} /> 以开始使用。
        </div>
    </div>;
}

export function renderCollaboration(windowService: WindowService): React.ReactNode {
    return <div className='gs-section'>
        <h3 className='gs-section-header'>
            <i className={codicon('live-share')}></i>
            协作
        </h3>
        <div>
            点击状态栏中的 <i>协作</i> 即可与他人共享工作区并实时协作。该功能由
            <BrowserLink text="Open Collaboration Tools" url="https://www.open-collab.tools/" windowService={windowService} /> 提供支持，并使用其公共
            服务器基础设施。
        </div>
    </div>;
}

export function renderSupport(windowService: WindowService): React.ReactNode {
    return <div className='gs-section'>
        <h3 className='gs-section-header'>
            <i className={codicon('organization')}></i>
            专业支持
        </h3>
        <div>
            Theia IDE 及其他基于 Eclipse Theia 的工具的专业支持、实施服务、咨询与培训可由优选公司提供。它们列于
            <BrowserLink text="Theia 支持页面" url="https://theia-ide.org/support/" windowService={windowService} />。
        </div>
    </div>;
}

export function renderCommunity(windowService: WindowService): React.ReactNode {
    return <div className='gs-section'>
        <h3 className='gs-section-header'>
            <i className={codicon('comment-discussion')}></i>
            社区
        </h3>
        <div>
            Theia IDE 的功能来自 Theia 及内置扩展，而本项目将它们打包为产品及其安装程序。因此，请将功能缺陷报告给
            <BrowserLink text="Theia 项目" url="https://github.com/eclipse-theia/theia/issues/new/choose" windowService={windowService} />，
            将打包或安装程序的问题报告给
            <BrowserLink text="Theia IDE 项目" url="https://github.com/eclipse-theia/theia-ide/issues/new/choose" windowService={windowService} />。
        </div>
        <div>
            Theia IDE 的 <BrowserLink text="源代码" url="https://github.com/eclipse-theia/theia-ide" windowService={windowService} /> 可在
            GitHub 上获取。
        </div>
    </div>;
}

export interface BrandingProps {
    windowService: WindowService;
}

/**
 * Renders nothing outside of the desktop application: the updater and its `updates.*` preferences are
 * contributed by `theia-ide-updater-ext`, which is part of the Electron builds only.
 */
export function renderUpdates(props: BrandingProps): React.ReactNode {
    if (!environment.electron.is()) {
        return undefined;
    }
    return <div className='gs-section'>
        <h3 className='gs-section-header'>
            <i className={codicon('cloud-download')}></i>
            更新
        </h3>
        <div>
            您可以在本应用中通过 帮助 {'>'} 检查更新… 直接更新 Theia IDE。它还会在每次启动后自动检查更新。
        </div>
        <div>
            您也可以从
            <BrowserLink text="下载页面" url={DOWNLOAD_URL} windowService={props.windowService} /> 获取最新版本。
        </div>
    </div>;
}

/**
 * The product description as shown by both the welcome page and the About dialog. Sharing the whole list
 * rather than only the individual sections keeps the two from drifting apart as sections come and go.
 */
export function renderBrandingSections(props: BrandingProps): React.ReactNode {
    const row = (content: React.ReactNode) => <div className='flex-grid'><div className='col'>{content}</div></div>;
    const updates = renderUpdates(props);
    return <React.Fragment>
        {row(renderWhatIs(props.windowService))}
        {row(renderExtendingCustomizing(props.windowService))}
        {row(renderCollaboration(props.windowService))}
        {row(renderSupport(props.windowService))}
        {row(renderCommunity(props.windowService))}
        {updates && row(updates)}
    </React.Fragment>;
}
