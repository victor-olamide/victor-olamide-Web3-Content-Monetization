'use strict';

const request = require('supertest');
const express = require('express');

jest.mock('../services/searchService');
const searchService = require('../services/searchService');
const contentRoutes = require('../routes/contentRoutes');

let app;

beforeEach(() => {
  jest.clearAllMocks();
  app = express();
  app.use(express.json());
  app.use('/api/content', contentRoutes);
});

describe('GET /api/content', () => {
  it('returns paginated results from searchService', async () => {
    const payload = {
      page: 1,
      limit: 10,
      total: 1,
      pages: 1,
      results: [{ contentId: 42, title: 'Searchable Content' }],
      facets: { contentType: { video: 1 } }
    };

    searchService.searchContent.mockResolvedValue(payload);

    const response = await request(app)
      .get('/api/content')
      .query({ category: 'video', creator: 'alice', q: 'blockchain', page: '1', limit: '10' });

    expect(response.status).toBe(200);
    expect(searchService.searchContent).toHaveBeenCalledWith(expect.objectContaining({ category: 'video', creator: 'alice', q: 'blockchain', page: '1', limit: '10' }));
    expect(response.body).toEqual(payload);
  });

  it('returns default paging metadata when no query arguments are provided', async () => {
    searchService.searchContent.mockResolvedValue({ page: 1, limit: 20, total: 0, pages: 0, results: [], facets: { contentType: {} } });

    const response = await request(app).get('/api/content');

    expect(response.status).toBe(200);
    expect(searchService.searchContent).toHaveBeenCalledWith({});
    expect(response.body.page).toBe(1);
    expect(response.body.limit).toBe(20);
  });

  it('returns 500 when the search service fails', async () => {
    searchService.searchContent.mockRejectedValue(new Error('search failed'));

    const response = await request(app).get('/api/content');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('search failed');
  });

  it('routes GET /api/content/search through searchService', async () => {
    const payload = {
      page: 1,
      limit: 20,
      total: 1,
      pages: 1,
      results: [{ contentId: 99, title: 'Search Endpoint Content' }],
      facets: { contentType: { image: 1 } }
    };

    searchService.searchContent.mockResolvedValue(payload);

    const response = await request(app)
      .get('/api/content/search')
      .query({ q: 'hello' });

    expect(response.status).toBe(200);
    expect(searchService.searchContent).toHaveBeenCalledWith({ q: 'hello' });
    expect(response.body).toEqual(payload);
  });
});
