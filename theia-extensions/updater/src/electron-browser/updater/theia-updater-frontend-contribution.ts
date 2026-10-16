/********************************************************************************
 * Copyright (C) 2020 TypeFox, EclipseSource and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 *
 * SPDX-License-Identifier: MIT
 ********************************************************************************/

import {
    Command,
    CommandContribution,
    CommandRegistry,
    Emitter,
    MenuContribution,
    MenuModelRegistry,
    MenuPath,
    MessageService,
    Progress
} from '@theia/core/lib/common';
import { PreferenceScope, PreferenceService } from '@theia/core/lib/common';
import { TheiaUpdater, TheiaUpdaterClient, UpdaterError, UpdateInfo, UpdateAvailabilityInfo, UpdaterSettings } from '../../common/updater/theia-updater';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import { CommonMenus, OpenerService } from '@theia/core/lib/browser';
import { ElectronMainMenuFactory } from '@theia/core/lib/electron-browser/menu/electron-main-menu-factory';
import URI from '@theia/core/lib/common/uri';
import { URI as VSCodeURI } from 'vscode-uri';

export namespace TheiaUpdaterCommands {

    const category = 'Theia 更新器';

    export const CHECK_FOR_UPDATES: Command = {
        id: 'electron-theia:check-for-updates',
        label: '检查更新...',
        category
    };

    export const RESTART_TO_UPDATE: Command = {
        id: 'electron-theia:restart-to-update',
        label: '重启以更新',
        category
    };

}

export namespace TheiaUpdaterMenu {
    /**
     * `Help` is where desktop applications conventionally offer the update check, VS Code included. On macOS
     * it would belong in the application menu, but Theia builds that one from a fixed template, so `Help` is
     * used on every platform.
     *
     * The entries go straight into `Help` rather than into a group of their own: a group is positioned by its
     * id, so only an action registered directly can be placed with an `order`.
     */
    export const MENU_PATH: MenuPath = CommonMenus.HELP;
}

@injectable()
export class TheiaUpdaterClientImpl implements TheiaUpdaterClient {

    protected readonly onReadyToInstallEmitter = new Emitter<void>();
    readonly onReadyToInstall = this.onReadyToInstallEmitter.event;

    protected readonly onUpdateAvailableEmitter = new Emitter<UpdateAvailabilityInfo>();
    readonly onUpdateAvailable = this.onUpdateAvailableEmitter.event;

    protected readonly onErrorEmitter = new Emitter<UpdaterError>();
    readonly onError = this.onErrorEmitter.event;

    protected readonly onCancelEmitter = new Emitter<void>();
    readonly onCancel = this.onCancelEmitter.event;

    notifyReadyToInstall(): void {
        this.onReadyToInstallEmitter.fire();
    }

    updateAvailable(available: boolean, updateInfo?: UpdateInfo, notifyIfNoUpdate = true): void {
        this.onUpdateAvailableEmitter.fire({ available, updateInfo, notifyIfNoUpdate });
    }

    reportError(error: UpdaterError): void {
        this.onErrorEmitter.fire(error);
    }

    reportCancelled(): void {
        this.onCancelEmitter.fire();
    }

}

// Dynamic menus aren't yet supported by electron: https://github.com/eclipse-theia/theia/issues/446
@injectable()
export class ElectronMenuUpdater {

    @inject(ElectronMainMenuFactory)
    protected readonly factory: ElectronMainMenuFactory;

    public update(): void {
        this.setMenu();
    }

    private setMenu(): void {
        window.electronTheiaCore.setMenu(this.factory.createElectronMenuBar());
    }

}

@injectable()
export class TheiaUpdaterFrontendContribution implements CommandContribution, MenuContribution {

    @inject(MessageService)
    protected readonly messageService: MessageService;

    @inject(ElectronMenuUpdater)
    protected readonly menuUpdater: ElectronMenuUpdater;

    @inject(TheiaUpdater)
    protected readonly updater: TheiaUpdater;

    @inject(TheiaUpdaterClientImpl)
    protected readonly updaterClient: TheiaUpdaterClientImpl;

    @inject(PreferenceService)
    private readonly preferenceService: PreferenceService;

    @inject(OpenerService)
    protected readonly openerService: OpenerService;

    protected readyToUpdate = false;

    private progress: Progress | undefined;
    private intervalId: NodeJS.Timeout | undefined;
    private currentUpdateInfo: UpdateInfo | undefined;

    @postConstruct()
    protected init(): void {
        this.updaterClient.onUpdateAvailable(({ available, updateInfo, notifyIfNoUpdate }) => {
            if (available) {
                this.currentUpdateInfo = updateInfo;
                this.handleDownloadUpdate(updateInfo);
            } else if (notifyIfNoUpdate) {
                this.handleNoUpdate();
            }
        });

        this.updaterClient.onReadyToInstall(async () => {
            this.readyToUpdate = true;
            this.menuUpdater.update();
            this.handleUpdatesAvailable();
        });

        this.updaterClient.onError(error => this.handleError(error));
        this.updaterClient.onCancel(() => this.stopProgress());

        this.preferenceService.ready.then(() => {
            this.syncUpdaterSettings();
        });
        this.preferenceService.onPreferenceChanged(e => {
            if (e.preferenceName === 'updates.checkForUpdates' ||
                e.preferenceName === 'updates.checkInterval' ||
                e.preferenceName === 'updates.channel') {
                this.syncUpdaterSettings();
            }
        });
    }

    protected syncUpdaterSettings(): void {
        const settings: UpdaterSettings = {
            checkForUpdates: this.preferenceService.get<boolean>('updates.checkForUpdates', true),
            checkInterval: this.preferenceService.get<number>('updates.checkInterval', 60),
            channel: this.preferenceService.get<'stable' | 'preview' | 'next'>('updates.channel', 'stable')
        };
        this.updater.setUpdaterSettings(settings);
    }

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand(TheiaUpdaterCommands.CHECK_FOR_UPDATES, {
            execute: async () => {
                this.updater.checkForUpdates();
            },
            isEnabled: () => !this.readyToUpdate,
            isVisible: () => !this.readyToUpdate
        });
        registry.registerCommand(TheiaUpdaterCommands.RESTART_TO_UPDATE, {
            execute: () => this.updater.onRestartToUpdateRequested(),
            isEnabled: () => this.readyToUpdate,
            isVisible: () => this.readyToUpdate
        });
    }

    registerMenus(registry: MenuModelRegistry): void {
        // `z` keeps the update entries at the bottom of `Help`, below `About`, which core registers with `9`.
        registry.registerMenuAction(TheiaUpdaterMenu.MENU_PATH, {
            commandId: TheiaUpdaterCommands.CHECK_FOR_UPDATES.id,
            order: 'z1'
        });
        registry.registerMenuAction(TheiaUpdaterMenu.MENU_PATH, {
            commandId: TheiaUpdaterCommands.RESTART_TO_UPDATE.id,
            order: 'z2'
        });
    }

    protected async handleDownloadUpdate(updateInfo?: UpdateInfo): Promise<void> {
        const message = updateInfo
            ? `发现新版本 ${updateInfo.version}，是否更新？`
            : '发现可用更新，是否更新？';
        const actions = ['暂不', '是'];
        const checkForUpdates = this.preferenceService.get<boolean>('updates.checkForUpdates', true);
        if (checkForUpdates) {
            actions.push('不再检查');
        }
        const answer = await this.messageService.info(message, ...actions);
        if (answer === '不再检查') {
            this.preferenceService.set('updates.checkForUpdates', false, PreferenceScope.User);
            return;
        }
        if (answer === '是') {
            this.stopProgress();
            this.progress = await this.messageService.showProgress({
                text: 'Theia IDE 更新',
                options: { cancelable: true }
            }, () => this.updater.cancel());
            let dots = 0;
            this.intervalId = setInterval(() => {
                if (this.progress !== undefined) {
                    dots = (dots + 1) % 4;
                    this.progress.report({ message: '正在下载' + '…'.repeat(dots) });
                }
            }, 1000);
            this.updater.downloadUpdate();
        }
    }

    protected async handleNoUpdate(): Promise<void> {
        this.messageService.info('已在使用最新版本');
    }

    protected async handleUpdatesAvailable(): Promise<void> {
        if (this.progress !== undefined) {
            this.progress.report({ work: { done: 1, total: 1 } });
            this.stopProgress();
        }
        const message = this.currentUpdateInfo
            ? `更新版本 ${this.currentUpdateInfo.version} 已下载，将在退出时自动安装。是否立即重启？`
            : '更新已下载，将在退出时自动安装。是否立即重启？';
        const answer = await this.messageService.info(message, '否', '是');
        if (answer === '是') {
            this.updater.onRestartToUpdateRequested();
        }
    }

    protected async handleError(error: UpdaterError): Promise<void> {
        this.stopProgress();
        if (error.errorLogPath) {
            const viewLogAction = '查看错误日志';
            const answer = await this.messageService.error(error.message, viewLogAction);
            if (answer === viewLogAction) {
                const uri = new URI(VSCodeURI.file(error.errorLogPath));
                const opener = await this.openerService.getOpener(uri);
                opener.open(uri);
            }
        } else {
            this.messageService.error(error.message);
        }
    }

    private stopProgress(): void {
        if (this.intervalId !== undefined) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
        if (this.progress !== undefined) {
            this.progress.cancel();
            this.progress = undefined;
        }
    }
}
