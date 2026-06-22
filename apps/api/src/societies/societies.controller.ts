import { Controller, Get, Query } from '@nestjs/common';
import { SocietiesService } from './societies.service';

@Controller('societies')
export class SocietiesController {
  constructor(private readonly societies: SocietiesService) {}

  @Get()
  list(@Query('city') city?: string) {
    return this.societies.list(city);
  }
}
