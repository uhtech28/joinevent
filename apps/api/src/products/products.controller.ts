import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import {
  createProductSchema,
  updateProductSchema,
  type PublicProduct,
} from './dto/product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  // GET /api/v1/products/by-username/:username — public catalogue.
  @Get('by-username/:username')
  byUsername(@Param('username') username: string): Promise<PublicProduct[]> {
    return this.products.listForUsername(username);
  }

  // GET /api/v1/products/mine — vendor's own products (incl. inactive).
  @UseGuards(JwtAuthGuard)
  @Get('mine')
  mine(@CurrentUser() user: { id: string }): Promise<PublicProduct[]> {
    return this.products.listMine(user.id);
  }

  // GET /api/v1/products/:id — public details.
  @Get(':id')
  get(@Param('id') id: string): Promise<PublicProduct> {
    return this.products.findById(id);
  }

  // POST /api/v1/products — create (vendor only).
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @CurrentUser() user: { id: string },
    @Body() raw: unknown,
  ): Promise<PublicProduct> {
    const parsed = createProductSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'invalid_payload',
        issues: parsed.error.flatten(),
      });
    }
    return this.products.create(user.id, parsed.data);
  }

  // PATCH /api/v1/products/:id — update (owner).
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() raw: unknown,
  ): Promise<PublicProduct> {
    const parsed = updateProductSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'invalid_payload',
        issues: parsed.error.flatten(),
      });
    }
    return this.products.update(user.id, id, parsed.data);
  }

  // DELETE /api/v1/products/:id — delete (owner).
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(200)
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.products.remove(user.id, id);
  }
}
