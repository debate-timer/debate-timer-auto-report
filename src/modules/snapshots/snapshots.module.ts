import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SnapshotsRepository } from './snapshots.repository';
import { SnapshotsService } from './snapshots.service';

@Module({
  imports: [PrismaModule],
  providers: [SnapshotsRepository, SnapshotsService],
  exports: [SnapshotsService],
})
export class SnapshotsModule {}
