import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Global module — PrismaService is injectable in any other module without re-importing.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
