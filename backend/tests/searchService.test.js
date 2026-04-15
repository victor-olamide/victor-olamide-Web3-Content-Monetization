'use strict';

jest.mock('../models/Content');
const Content = require('../models/Content');
const { buildQuery, searchContent } = require('../services/searchService');

const createCursor = (results) => {
  const exec = jest.fn().mockResolvedValue(results);
  return {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec,
  };
};

describe('searchService.buildQuery', () => {
  it('builds a default active content query', () => {
    expect(buildQuery({})).toEqual({ isRemoved: false });
  });

  it('supports category alias for contentType filtering', () => {
    expect(buildQuery({ category: 'video' })).toEqual({ isRemoved: false, contentType: 'video' });
  });

  it('trims whitespace from category and creator filters', () => {
    expect(buildQuery({ category: ' video ', creator: ' alice ' })).toEqual({ isRemoved: false, contentType: 'video', creator: 'alice' });
  });

  it('supports minPrice and maxPrice filters', () => {
    expect(buildQuery({ minPrice: '2.5', maxPrice: '10' })).toEqual({
      isRemoved: false,
      price: { $gte: 2.5, $lte: 10 }
    });
  });

  it('prefers explicit contentType over category alias', () => {
    expect(buildQuery({ category: 'image', contentType: 'article' })).toEqual({ isRemoved: false, contentType: 'article' });
  });

  it('honors explicit isRemoved values when provided', () => {
    expect(buildQuery({ isRemoved: 'true' })).toEqual({ isRemoved: true });
  });

  it('adds text search when q is provided', () => {
    expect(buildQuery({ q: 'crypto' })).toEqual({ isRemoved: false, $text: { $search: 'crypto' } });
  });
});

describe('searchService.searchContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('queries Content with pagination and returns metadata', async () => {
    const cursor = createCursor([{ contentId: 101, title: 'Test Content' }]);
    Content.find.mockReturnValue(cursor);
    Content.countDocuments.mockResolvedValue(1);
    Content.aggregate.mockReturnValue({ exec: jest.fn().mockResolvedValue([{ _id: 'video', count: 1 }]) });

    const result = await searchContent({ page: '2', limit: '5', category: 'video', creator: 'alice', q: 'token' });

    expect(Content.find).toHaveBeenCalledWith(
      { isRemoved: false, contentType: 'video', creator: 'alice', $text: { $search: 'token' } },
      { score: { $meta: 'textScore' } }
    );
    expect(Content.countDocuments).toHaveBeenCalledWith({ isRemoved: false, contentType: 'video', creator: 'alice', $text: { $search: 'token' } });
    expect(result).toMatchObject({ page: 2, limit: 5, total: 1, pages: 1, results: [{ contentId: 101, title: 'Test Content' }], facets: { contentType: { video: 1 } } });
  });

  it('does not include text score projection when q is omitted', async () => {
    const cursor = createCursor([{ contentId: 102, title: 'Another Content' }]);
    Content.find.mockReturnValue(cursor);
    Content.countDocuments.mockResolvedValue(1);
    Content.aggregate.mockReturnValue({ exec: jest.fn().mockResolvedValue([{ _id: 'article', count: 1 }]) });

    const result = await searchContent({ page: '1', limit: '10', category: 'article' });

    expect(Content.find).toHaveBeenCalledWith(
      { isRemoved: false, contentType: 'article' },
      {}
    );
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });

  it('defaults page and limit when invalid values are passed', async () => {
    const cursor = createCursor([{ contentId: 103 }]);
    Content.find.mockReturnValue(cursor);
    Content.countDocuments.mockResolvedValue(0);
    Content.aggregate.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });

    const result = await searchContent({ page: 'x', limit: 'y' });

    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('sorts by createdAt descending when q is omitted', async () => {
    const cursor = createCursor([{ contentId: 104 }]);
    Content.find.mockReturnValue(cursor);
    Content.countDocuments.mockResolvedValue(1);
    Content.aggregate.mockReturnValue({ exec: jest.fn().mockResolvedValue([{ _id: 'music', count: 1 }]) });

    await searchContent({ page: '1', limit: '20' });

    expect(cursor.sort).toHaveBeenCalledWith({ createdAt: -1 });
  });
});
