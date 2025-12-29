import { BadRequestException, Injectable } from '@nestjs/common';
import { SystemSettingsService } from '../system/system-settings.service';

export interface PosterSearchResult {
  id: number;
  title: string;
  original_title: string;
  poster_path: string;
  poster_url?: string;
  poster_urls?: string[];
  backdrop_path?: string;
  backdrop_url?: string;
  backdrop_urls?: string[];
  release_date?: string;
  overview?: string;
  vote_average?: number;
  media_type: 'movie' | 'tv';
}

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

@Injectable()
export class PosterSearchService {
  constructor(private readonly systemSettings: SystemSettingsService) {}

  private async getApiKey(): Promise<string> {
    const settings = await this.systemSettings.get();
    const key = (settings as any).tmdbApiKey;
    if (!key) throw new BadRequestException('请先配置 TMDB API Key');
    return key;
  }

  async searchMovie(keyword: string, page = 1): Promise<{ results: PosterSearchResult[]; total: number; page: number; totalPages: number }> {
    const apiKey = await this.getApiKey();
    const url = `${TMDB_BASE}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(keyword)}&page=${page}&language=zh-CN`;

    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new BadRequestException(`TMDB API error: ${response.status}`);

    const data = await response.json();
    const results: PosterSearchResult[] = await Promise.all(
      (data.results || []).map(async (item: any) => {
        const images = await this.getImages(item.id, 'movie');
        return {
          id: item.id,
          title: item.title || '',
          original_title: item.original_title || '',
          poster_path: item.poster_path || '',
          poster_url: item.poster_path ? `${TMDB_IMAGE_BASE}/w500${item.poster_path}` : '',
          poster_urls: images.posters,
          backdrop_path: item.backdrop_path || '',
          backdrop_url: item.backdrop_path ? `${TMDB_IMAGE_BASE}/w780${item.backdrop_path}` : '',
          backdrop_urls: images.backdrops,
          release_date: item.release_date || '',
          overview: item.overview || '',
          vote_average: item.vote_average || 0,
          media_type: 'movie' as const,
        };
      })
    );

    return { results, total: data.total_results || 0, page: data.page || 1, totalPages: data.total_pages || 0 };
  }

  async searchTv(keyword: string, page = 1): Promise<{ results: PosterSearchResult[]; total: number; page: number; totalPages: number }> {
    const apiKey = await this.getApiKey();
    const url = `${TMDB_BASE}/search/tv?api_key=${apiKey}&query=${encodeURIComponent(keyword)}&page=${page}&language=zh-CN`;

    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new BadRequestException(`TMDB API error: ${response.status}`);

    const data = await response.json();
    const results: PosterSearchResult[] = await Promise.all(
      (data.results || []).map(async (item: any) => {
        const images = await this.getImages(item.id, 'tv');
        return {
          id: item.id,
          title: item.name || '',
          original_title: item.original_name || '',
          poster_path: item.poster_path || '',
          poster_url: item.poster_path ? `${TMDB_IMAGE_BASE}/w500${item.poster_path}` : '',
          poster_urls: images.posters,
          backdrop_path: item.backdrop_path || '',
          backdrop_url: item.backdrop_path ? `${TMDB_IMAGE_BASE}/w780${item.backdrop_path}` : '',
          backdrop_urls: images.backdrops,
          release_date: item.first_air_date || '',
          overview: item.overview || '',
          vote_average: item.vote_average || 0,
          media_type: 'tv' as const,
        };
      })
    );

    return { results, total: data.total_results || 0, page: data.page || 1, totalPages: data.total_pages || 0 };
  }

  async searchMulti(keyword: string, page = 1): Promise<{ results: PosterSearchResult[]; total: number; page: number; totalPages: number }> {
    const apiKey = await this.getApiKey();
    const url = `${TMDB_BASE}/search/multi?api_key=${apiKey}&query=${encodeURIComponent(keyword)}&page=${page}&language=zh-CN`;

    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new BadRequestException(`TMDB API error: ${response.status}`);

    const data = await response.json();
    const results: PosterSearchResult[] = await Promise.all(
      (data.results || [])
        .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
        .map(async (item: any) => {
          const isMovie = item.media_type === 'movie';
          const images = await this.getImages(item.id, item.media_type);
          return {
            id: item.id,
            title: isMovie ? (item.title || '') : (item.name || ''),
            original_title: isMovie ? (item.original_title || '') : (item.original_name || ''),
            poster_path: item.poster_path || '',
            poster_url: item.poster_path ? `${TMDB_IMAGE_BASE}/w500${item.poster_path}` : '',
            poster_urls: images.posters,
            backdrop_path: item.backdrop_path || '',
            backdrop_url: item.backdrop_path ? `${TMDB_IMAGE_BASE}/w780${item.backdrop_path}` : '',
            backdrop_urls: images.backdrops,
            release_date: isMovie ? (item.release_date || '') : (item.first_air_date || ''),
            overview: item.overview || '',
            vote_average: item.vote_average || 0,
            media_type: item.media_type,
          };
        })
    );

    return { results, total: data.total_results || 0, page: data.page || 1, totalPages: data.total_pages || 0 };
  }

  getImageSizes() {
    return {
      poster: ['w92', 'w154', 'w185', 'w342', 'w500', 'w780', 'original'],
      backdrop: ['w300', 'w780', 'w1280', 'original'],
    };
  }

  buildImageUrl(path: string, size = 'w500'): string {
    if (!path) return '';
    return `${TMDB_IMAGE_BASE}/${size}${path}`;
  }

  private async getImages(id: number, mediaType: 'movie' | 'tv'): Promise<{ posters: string[]; backdrops: string[] }> {
    const apiKey = await this.getApiKey();
    const url = `${TMDB_BASE}/${mediaType}/${id}/images?api_key=${apiKey}`;

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) return { posters: [], backdrops: [] };

      const data = await response.json();
      const posters = (data.posters || []).slice(0, 5).map((p: any) => `${TMDB_IMAGE_BASE}/w500${p.file_path}`);
      const backdrops = (data.backdrops || []).slice(0, 5).map((b: any) => `${TMDB_IMAGE_BASE}/w780${b.file_path}`);

      return { posters, backdrops };
    } catch {
      return { posters: [], backdrops: [] };
    }
  }

  async getVideos(id: number, mediaType: 'movie' | 'tv'): Promise<{ key: string; name: string; site: string; type: string; url: string }[]> {
    const apiKey = await this.getApiKey();
    const url = `${TMDB_BASE}/${mediaType}/${id}/videos?api_key=${apiKey}&language=zh-CN`;

    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new BadRequestException(`TMDB API error: ${response.status}`);

    const data = await response.json();
    let results = (data.results || []) as { key: string; name: string; site: string; type: string }[];

    // 如果中文没有结果，尝试英文
    if (!results.length) {
      const enUrl = `${TMDB_BASE}/${mediaType}/${id}/videos?api_key=${apiKey}&language=en-US`;
      const enResponse = await fetch(enUrl, { signal: AbortSignal.timeout(10000) });
      if (enResponse.ok) {
        const enData = await enResponse.json();
        results = (enData.results || []) as { key: string; name: string; site: string; type: string }[];
      }
    }

    return results.map((v) => ({
      key: v.key,
      name: v.name,
      site: v.site,
      type: v.type,
      url: v.site === 'YouTube' ? `https://www.youtube.com/watch?v=${v.key}` : v.site === 'Vimeo' ? `https://vimeo.com/${v.key}` : '',
    }));
  }
}
