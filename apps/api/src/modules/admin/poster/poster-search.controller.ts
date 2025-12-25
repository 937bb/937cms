import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { PosterSearchService } from './poster-search.service';

@Controller('admin/poster')
@UseGuards(AdminGuard)
export class PosterSearchController {
  constructor(private readonly posterSearch: PosterSearchService) {}

  @Get('search')
  async search(
    @Query('keyword') keyword: string,
    @Query('type') type: string,
    @Query('page') page: string,
  ) {
    const kw = String(keyword || '').trim();
    if (!kw) return { results: [], total: 0, page: 1, totalPages: 0 };

    const p = Math.max(1, parseInt(page, 10) || 1);
    const t = type || 'multi';

    if (t === 'movie') {
      return this.posterSearch.searchMovie(kw, p);
    } else if (t === 'tv') {
      return this.posterSearch.searchTv(kw, p);
    } else {
      return this.posterSearch.searchMulti(kw, p);
    }
  }

  @Get('sizes')
  getSizes() {
    return this.posterSearch.getImageSizes();
  }

  @Get('videos')
  async getVideos(@Query('id') id: string, @Query('type') type: string) {
    const numId = parseInt(id, 10);
    if (!numId) return [];
    const mediaType = type === 'tv' ? 'tv' : 'movie';
    return this.posterSearch.getVideos(numId, mediaType);
  }
}
