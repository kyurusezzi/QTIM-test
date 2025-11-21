import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { Article } from './entities/article.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { QueryArticlesDto } from './dto/query-articles.dto';

describe('ArticlesService', () => {
  let service: ArticlesService;
  let repository: Repository<Article>;
  let cacheManager: any;

  const mockArticle = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'Test Article',
    description: 'Test Description',
    publicationDate: new Date('2024-01-01'),
    authorId: 'user-123',
    author: {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesService,
        {
          provide: getRepositoryToken(Article),
          useValue: mockRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<ArticlesService>(ArticlesService);
    repository = module.get<Repository<Article>>(getRepositoryToken(Article));
    cacheManager = module.get(CACHE_MANAGER);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new article', async () => {
      const createDto: CreateArticleDto = {
        title: 'Test Article',
        description: 'Test Description',
        publicationDate: '2024-01-01',
      };
      const userId = 'user-123';

      mockRepository.create.mockReturnValue(mockArticle);
      mockRepository.save.mockResolvedValue(mockArticle);
      // Mock the findOne call that happens after save to fetch article with author
      mockRepository.findOne.mockResolvedValue(mockArticle);
      mockCacheManager.del.mockResolvedValue(undefined);

      const result = await service.create(createDto, userId);

      expect(result).toEqual(mockArticle);
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createDto,
        authorId: userId,
      });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockArticle.id },
        relations: ['author'],
      });
    });
  });

  describe('findOne', () => {
    it('should return an article from cache if available', async () => {
      mockCacheManager.get.mockResolvedValue(mockArticle);

      const result = await service.findOne(mockArticle.id);

      expect(result).toEqual(mockArticle);
      expect(mockCacheManager.get).toHaveBeenCalledWith(`article:${mockArticle.id}`);
      expect(mockRepository.findOne).not.toHaveBeenCalled();
    });

    it('should return an article from database if not in cache', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockRepository.findOne.mockResolvedValue(mockArticle);
      mockCacheManager.set.mockResolvedValue(undefined);

      const result = await service.findOne(mockArticle.id);

      expect(result).toEqual(mockArticle);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockArticle.id },
        relations: ['author'],
      });
      expect(mockCacheManager.set).toHaveBeenCalled();
    });

    it('should throw NotFoundException if article not found', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update an article', async () => {
      const updateDto: UpdateArticleDto = {
        title: 'Updated Title',
      };
      const userId = 'user-123';

      mockCacheManager.get.mockResolvedValue(null);
      mockRepository.findOne.mockResolvedValue(mockArticle);
      mockRepository.save.mockResolvedValue({ ...mockArticle, ...updateDto });
      mockCacheManager.del.mockResolvedValue(undefined);
      mockCacheManager.set.mockResolvedValue(undefined);

      const result = await service.update(mockArticle.id, updateDto, userId);

      expect(result.title).toBe(updateDto.title);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user is not the author', async () => {
      const updateDto: UpdateArticleDto = {
        title: 'Updated Title',
      };
      const differentUserId = 'different-user';

      mockCacheManager.get.mockResolvedValue(null);
      mockRepository.findOne.mockResolvedValue(mockArticle);

      await expect(
        service.update(mockArticle.id, updateDto, differentUserId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should remove an article', async () => {
      const userId = 'user-123';

      mockCacheManager.get.mockResolvedValue(null);
      mockRepository.findOne.mockResolvedValue(mockArticle);
      mockRepository.remove.mockResolvedValue(mockArticle);
      mockCacheManager.del.mockResolvedValue(undefined);

      await service.remove(mockArticle.id, userId);

      expect(mockRepository.remove).toHaveBeenCalledWith(mockArticle);
    });

    it('should throw ForbiddenException if user is not the author', async () => {
      const differentUserId = 'different-user';

      mockCacheManager.get.mockResolvedValue(null);
      mockRepository.findOne.mockResolvedValue(mockArticle);

      await expect(
        service.remove(mockArticle.id, differentUserId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAll', () => {
    it('should return cached results if available', async () => {
      const query: QueryArticlesDto = { page: 1, limit: 10 };
      const cachedResult = {
        data: [mockArticle],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      mockCacheManager.get.mockResolvedValue(cachedResult);

      const result = await service.findAll(query);

      expect(result).toEqual(cachedResult);
      expect(mockRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should query database and cache results if not cached', async () => {
      const query: QueryArticlesDto = { page: 1, limit: 10 };

      mockCacheManager.get.mockResolvedValue(null);

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockArticle], 1]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(queryBuilder);
      mockCacheManager.set.mockResolvedValue(undefined);

      const result = await service.findAll(query);

      expect(result.data).toEqual([mockArticle]);
      expect(result.total).toBe(1);
      expect(mockCacheManager.set).toHaveBeenCalled();
    });
  });
});
