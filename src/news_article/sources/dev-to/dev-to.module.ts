import { Module } from '@nestjs/common';

import { DevToClient } from './dev-to-client';

@Module({
    providers: [DevToClient],
    exports: [DevToClient],
})
export class DevToModule {}