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

  it('prefers explicit contentType over category alias', () => {
    expect(buildQuery({ category: 'image', contentType: 'article' })).toEqual({ isRemoved: false, contentType: 'article' });
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
});
