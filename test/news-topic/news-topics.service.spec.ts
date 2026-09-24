import { Test, TestingModule } from '@nestjs/testing';

import { NewsTopic } from '../../src/news-topic/news-topic.entity';
import { NewsTopicsService } from '../../src/news-topic/news-topics.service';
import { NewsTopicsRepository } from '../../src/news-topic/news-topics.repository';
import { NewsTopicsMapper } from '../../src/news-topic/dto/news-topics.mapper';

type TopicsRepositoryMock = jest.Mocked<
  Pick<NewsTopicsRepository, 'addTopic' | 'findByNames'>
>;

describe('NewsTopicsService: импорт тем', (): void => {
  let testingModule: TestingModule;
  let service: NewsTopicsService;
  let repository: TopicsRepositoryMock;

  beforeEach(async (): Promise<void> => {
    repository = {
      addTopic: jest.fn(),
      findByNames: jest.fn(),
    };

    repository.addTopic.mockResolvedValue(undefined);
    repository.findByNames.mockResolvedValue([]);

    testingModule = await Test.createTestingModule({
      providers: [
        NewsTopicsService,
        NewsTopicsMapper,
        {
          provide: NewsTopicsRepository,
          useValue: repository,
        },
      ],
    }).compile();

    service = testingModule.get<NewsTopicsService>(NewsTopicsService);
  });

  afterEach(async (): Promise<void> => {
    await testingModule.close();
  });

  it('нормализует названия и удаляет дубликаты', async (): Promise<void> => {
    await service.getOrCreateByNames([
      ' Python ',
      'python',
      'REACT',
      ' react ',
      '',
      '   ',
    ]);

    const expectedNames: string[] = ['python', 'react'];

    expect(repository.addTopic).toHaveBeenCalledTimes(1);
    expect(repository.addTopic).toHaveBeenCalledWith(expectedNames, undefined);
    expect(repository.findByNames).toHaveBeenCalledWith(
      expectedNames,
      undefined,
    );
  });

  it('возвращает и активные, и неактивные темы для связей статьи', async (): Promise<void> => {
    const activeTopic: NewsTopic = new NewsTopic();
    activeTopic.id = 1;
    activeTopic.name = 'python';
    activeTopic.isActive = true;

    const inactiveTopic: NewsTopic = new NewsTopic();
    inactiveTopic.id = 2;
    inactiveTopic.name = 'newtopic';
    inactiveTopic.isActive = false;

    repository.findByNames.mockResolvedValue([inactiveTopic, activeTopic]);

    const result: NewsTopic[] = await service.getOrCreateByNames([
      'python',
      'newtopic',
    ]);

    expect(result).toEqual([inactiveTopic, activeTopic]);
    expect(inactiveTopic.isActive).toBe(false);
    expect(activeTopic.isActive).toBe(true);
  });

  it('не обращается к репозиторию для пустых названий', async (): Promise<void> => {
    const result: NewsTopic[] = await service.getOrCreateByNames([
      '',
      ' ',
      '\t',
    ]);

    expect(result).toEqual([]);
    expect(repository.addTopic).not.toHaveBeenCalled();
    expect(repository.findByNames).not.toHaveBeenCalled();
  });
});
