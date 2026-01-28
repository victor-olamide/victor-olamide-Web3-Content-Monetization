const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

const sampleContent = [
  {
    contentId: 1,
    title: 'Stacks 101: Introduction to Web3 on Bitcoin',
    description: 'A comprehensive guide to building on Stacks.',
    contentType: 'video',
    price: 10000000, // 10 STX
    creator: 'SP3X....',
    url: 'ipfs://Qm...'
  },
  {
    contentId: 2,
    title: 'Clarity Smart Contract Best Practices',
    description: 'Learn how to write secure Clarity code.',
    contentType: 'article',
    price: 5000000, // 5 STX
    creator: 'SP3X....',
    url: 'ipfs://Qm...'
  }
];

async function seed() {
  for (const content of sampleContent) {
    try {
      const res = await axios.post(`${API_URL}/content`, content);
      console.log('Created content:', res.data.title);
    } catch (err) {
      console.error('Error creating content:', err.message);
    }
  }
}

seed();