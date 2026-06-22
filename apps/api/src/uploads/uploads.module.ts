import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { AuthModule } from '../auth/auth.module';

// StorageService is @Global so we don't need to import StorageModule here.
@Module({
  imports: [AuthModule],
  controllers: [UploadsController],
})
export class UploadsModule {}
