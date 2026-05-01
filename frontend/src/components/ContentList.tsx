'use client';

import React from 'react';

const ContentList: React.FC = () => {
  const contentItems = [
    { id: 1, title: 'Getting Started with Stacks', type: 'Video', price: 5, purchases: 12 },
    { id: 2, title: 'Clarity Deep Dive', type: 'Article', price: 15, purchases: 8 },
  ];

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 col-span-1 md:col-span-2">
      <h3 className="text-lg font-bold mb-4">Your Content</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchases</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {contentItems.map((item) => (
              <tr key={item.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.title}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.type}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.price} STX</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.purchases}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                  <button className="text-orange-600 hover:text-orange-900">Edit</button>
                  <button className="text-red-600 hover:text-red-900">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ContentList;
