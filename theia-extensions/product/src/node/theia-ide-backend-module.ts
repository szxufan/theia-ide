/********************************************************************************
 * Copyright (C) 2026 Theia IDE contributors.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 *
 * SPDX-License-Identifier: MIT
 ********************************************************************************/

import { ContainerModule } from '@theia/core/shared/inversify';
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { WsRequestValidatorContribution } from '@theia/core/lib/node/ws-request-validators';
import { AuthBackendContribution } from './auth-contribution';
import { AuthSessionService } from './auth-session-service';

export default new ContainerModule(bind => {
    bind(AuthSessionService).toSelf().inSingletonScope();
    bind(AuthBackendContribution).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(AuthBackendContribution);
    bind(WsRequestValidatorContribution).toService(AuthBackendContribution);
});
