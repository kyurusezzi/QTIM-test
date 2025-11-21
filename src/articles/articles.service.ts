import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Article } from './entities/article.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { QueryArticlesDto } from './dto/query-articles.dto';

@Injectable()
export class ArticlesService {
  private readonly logger = new Logger(ArticlesService.name);

  constructor(
    @InjectRepository(Article)
    private articlesRepository: Repository<Article>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async create(
    createArticleDto: CreateArticleDto,
    userId: string,
  ): Promise<Article> {
    this.logger.log(`Creating article for user ${userId}: ${createArticleDto.title}`);

    const article = this.articlesRepository.create({
      ...createArticleDto,
      authorId: userId,
    });
    const savedArticle = await this.articlesRepository.save(article);

    // Fetch the article with author relation to return complete data
    const articleWithAuthor = await this.articlesRepository.findOne({
      where: { id: savedArticle.id },
      relations: ['author'],
    });

    if (!articleWithAuthor) {
      throw new NotFoundException(
        `Article with ID ${savedArticle.id} not found after creation`,
      );
    }

    this.logger.log(`Article created successfully: ${savedArticle.id}`);
    return articleWithAuthor;
  }

  async findAll(query: QueryArticlesDto): Promise<{
    data: Article[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10, authorId, fromDate, toDate, search } = query;

    this.logger.log(`Fetching articles: page=${page}, limit=${limit}, filters=${JSON.stringify({ authorId, fromDate, toDate, search })}`);

    // Generate cache key based on query parameters
    const cacheKey = `articles:${JSON.stringify(query)}`;

    // Try to get from cache
    const cachedResult = await this.cacheManager.get(cacheKey);
    if (cachedResult) {
      this.logger.log('Returning cached articles');
      return cachedResult as any;
    }

    const skip = (page - 1) * limit;

    // Build query
    const queryBuilder = this.articlesRepository
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.author', 'author')
      .skip(skip)
      .take(limit)
      .orderBy('article.publicationDate', 'DESC');

    // Apply filters
    if (authorId) {
      queryBuilder.andWhere('article.authorId = :authorId', { authorId });
    }

    if (fromDate && toDate) {
      queryBuilder.andWhere(
        'article.publicationDate BETWEEN :fromDate AND :toDate',
        { fromDate, toDate },
      );
    } else if (fromDate) {
      queryBuilder.andWhere('article.publicationDate >= :fromDate', {
        fromDate,
      });
    } else if (toDate) {
      queryBuilder.andWhere('article.publicationDate <= :toDate', { toDate });
    }

    if (search) {
      queryBuilder.andWhere(
        '(article.title ILIKE :search OR article.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await queryBuilder.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    this.logger.log(`Found ${total} articles, returning page ${page}/${totalPages}`);

    const result = {
      data,
      total,
      page,
      limit,
      totalPages,
    };

    // Cache the result
    await this.cacheManager.set(cacheKey, result, 300000); // 5 minutes

    return result;
  }

  async findOne(id: string): Promise<Article> {
    this.logger.log(`Fetching article by ID: ${id}`);

    // Try to get from cache
    const cacheKey = `article:${id}`;
    const cachedArticle = await this.cacheManager.get(cacheKey);
    if (cachedArticle) {
      this.logger.log(`Returning cached article: ${id}`);
      return cachedArticle as Article;
    }

    const article = await this.articlesRepository.findOne({
      where: { id },
      relations: ['author'],
    });

    if (!article) {
      this.logger.warn(`Article not found: ${id}`);
      throw new NotFoundException(`Article with ID ${id} not found`);
    }

    // Cache the result
    await this.cacheManager.set(cacheKey, article, 300000); // 5 minutes

    this.logger.log(`Article found: ${id}`);
    return article;
  }

  async update(
    id: string,
    updateArticleDto: UpdateArticleDto,
    userId: string,
  ): Promise<Article> {
    this.logger.log(`User ${userId} attempting to update article ${id}`);

    // Check if at least one field has an actual value (not undefined)
    const hasFields = Object.values(updateArticleDto).some(
      (value) => value !== undefined,
    );

    if (!hasFields) {
      this.logger.warn(`Update failed: no fields provided for article ${id}`);
      throw new BadRequestException(
        'At least one field must be provided for update',
      );
    }

    const article = await this.findOne(id);

    if (article.authorId !== userId) {
      this.logger.warn(`Unauthorized update attempt on article ${id} by user ${userId}`);
      throw new ForbiddenException(
        'You are not authorized to update this article',
      );
    }

    Object.assign(article, updateArticleDto);
    const updatedArticle = await this.articlesRepository.save(article);

    // Invalidate cache
    await this.invalidateArticleCache(id);

    this.logger.log(`Article ${id} updated successfully by user ${userId}`);
    return updatedArticle;
  }

  async remove(id: string, userId: string): Promise<void> {
    this.logger.log(`User ${userId} attempting to delete article ${id}`);

    const article = await this.findOne(id);

    if (article.authorId !== userId) {
      this.logger.warn(`Unauthorized delete attempt on article ${id} by user ${userId}`);
      throw new ForbiddenException(
        'You are not authorized to delete this article',
      );
    }

    await this.articlesRepository.remove(article);

    // Invalidate cache
    await this.invalidateArticleCache(id);

    this.logger.log(`Article ${id} deleted successfully by user ${userId}`);
  }

  private async invalidateArticleCache(id: string): Promise<void> {
    const cacheKey = `article:${id}`;
    await this.cacheManager.del(cacheKey);
  }
}
