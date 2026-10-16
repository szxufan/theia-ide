/********************************************************************************
 * Copyright (C) 2022-2024 EclipseSource and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 *
 * SPDX-License-Identifier: MIT
 ********************************************************************************/

import { ConfirmDialog, Dialog, FrontendApplication, FrontendApplicationContribution, StorageService } from '@theia/core/lib/browser';
import { FrontendApplicationConfigProvider } from '@theia/core/lib/browser/frontend-application-config-provider';
import { Command, CommandContribution, CommandRegistry, ILogger, MaybePromise } from '@theia/core/lib/common';
import { nls } from '@theia/core/lib/common/nls';
import { inject, injectable } from '@theia/core/shared/inversify';
import { LauncherService } from './launcher-service';
import { DesktopFileService } from './desktopfile-service';

export namespace LauncherCommands {
    export const CREATE_LAUNCHER: Command = {
        id: 'theia-ide.launcher.create',
        label: '创建 CLI 启动器',
        category: 'Theia IDE'
    };
}

@injectable()
export class CreateLauncherCommandContribution implements FrontendApplicationContribution, CommandContribution {

    @inject(StorageService)
    protected readonly storageService: StorageService;

    @inject(ILogger)
    protected readonly logger: ILogger;

    @inject(LauncherService) private readonly launcherService: LauncherService;

    @inject(DesktopFileService) private readonly desktopFileService: DesktopFileService;

    onStart(_app: FrontendApplication): MaybePromise<void> {
        const appConfig = FrontendApplicationConfigProvider.get();
        const applicationName = appConfig.applicationName;
        const uriScheme = appConfig.electron.uriScheme;

        this.launcherService.getState(uriScheme).then(async state => {
            if (state === 'up-to-date') {
                this.logger.info('Application launcher already up to date.');
                return;
            }
            if (state === 'needs-silent-update') {
                // Prior consent recorded. We still show a brief heads-up before the OS
                // sudo prompt fires so the user knows what the password request is for.
                const confirmed = await this.confirmLauncherUpdate(uriScheme, true);
                if (confirmed) {
                    await this.launcherService.createLauncher(true, uriScheme);
                    this.logger.info('Application launcher updated to match current template.');
                } else {
                    this.logger.info('Application launcher update declined by user.');
                }
                return;
            }
            const messageContainer = document.createElement('div');
            // eslint-disable-next-line max-len
            messageContainer.textContent = nls.localizeByDefault(`是否安装用于启动应用程序的 shell 命令？\n安装后，您可以在命令行中输入 '${uriScheme}' 来运行 ${applicationName}。`);
            messageContainer.setAttribute('style', 'white-space: pre-line');
            const details = document.createElement('p');
            details.textContent = '需要管理员权限，接下来您需要输入密码。';
            messageContainer.appendChild(details);
            const dialog = new ConfirmDialog({
                title: nls.localizeByDefault('创建启动器'),
                msg: messageContainer,
                ok: Dialog.YES,
                cancel: Dialog.NO
            });
            const install = await dialog.open();
            this.launcherService.createLauncher(!!install, uriScheme);
            this.logger.info('Initialized application launcher.');
        });

        this.desktopFileService.getState({ applicationName, uriScheme }).then(async state => {
            if (state === 'up-to-date') {
                this.logger.info('Desktop file already up to date.');
                return;
            }
            if (state === 'needs-silent-update') {
                await this.desktopFileService.createOrUpdateDesktopfile(true, {
                    applicationName,
                    createUrlHandler: true,
                    uriScheme
                });
                this.logger.info('Desktop file silently updated to match current launcher template.');
                return;
            }
            const messageContainer = document.createElement('div');
            // eslint-disable-next-line max-len
            messageContainer.textContent = nls.localizeByDefault(`是否为 ${applicationName} 创建 .desktop 文件？\n这将使您能够更轻松地直接从应用程序菜单\n打开 ${applicationName}，并启用更多功能。`);
            messageContainer.setAttribute('style', 'white-space: pre-line');
            const dialog = new ConfirmDialog({
                title: nls.localizeByDefault('创建 .desktop 文件'),
                msg: messageContainer,
                ok: Dialog.YES,
                cancel: Dialog.NO
            });
            const install = await dialog.open();
            this.desktopFileService.createOrUpdateDesktopfile(!!install, {
                applicationName,
                createUrlHandler: true,
                uriScheme
            });
            this.logger.info('Created or updated .desktop file.');
        });
    }

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(LauncherCommands.CREATE_LAUNCHER, {
            execute: async () => {
                const uriScheme = FrontendApplicationConfigProvider.get().electron.uriScheme;
                const confirmed = await this.confirmLauncherUpdate(uriScheme, false);
                if (!confirmed) {
                    return;
                }
                await this.launcherService.createLauncher(true, uriScheme);
                this.logger.info('CLI launcher created or updated via command.');
            }
        });
    }

    protected async confirmLauncherUpdate(uriScheme: string, isUpdate: boolean): Promise<boolean> {
        const messageContainer = document.createElement('div');
        messageContainer.textContent = isUpdate
            ? `/usr/local/bin/${uriScheme} 处的 CLI 启动器需要刷新，以与当前应用程序保持一致。`
            : `这将在 /usr/local/bin/${uriScheme} 处创建或刷新 CLI 启动器。`;
        messageContainer.setAttribute('style', 'white-space: pre-line');
        const details = document.createElement('p');
        details.textContent = '需要管理员权限，接下来会提示您输入密码。';
        messageContainer.appendChild(details);
        const dialog = new ConfirmDialog({
            title: nls.localizeByDefault(isUpdate ? '更新 CLI 启动器' : '创建 CLI 启动器'),
            msg: messageContainer,
            ok: nls.localizeByDefault('确认'),
            cancel: nls.localizeByDefault('中止')
        });
        return !!await dialog.open();
    }
}
