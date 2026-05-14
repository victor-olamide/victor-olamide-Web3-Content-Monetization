import React from 'react';
import { render, screen } from '@testing-library/react';
import { ContentBrowser } from './ContentBrowser';

const sampleItems = [
  {
    contentId: 1,
    title: 'First Content',
    description: 'A great first piece of content.',
    contentType: 'video',
    price: 10,
    views: 120,
    revenue: 45.5,
    purchases: 8,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    url: 'https://example.com/1',
  },
];

describe('ContentBrowser', () => {
  it('renders the content browser header and controls', () => {
    render(<ContentBrowser items={sampleItems} />);

    expect(screen.getByPlaceholderText('Search by title or description...')).toBeInTheDocument();
    expect(screen.getByText('All types')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Views')).toBeInTheDocument();
    expect(screen.getByText('Revenue')).toBeInTheDocument();
  });
});
