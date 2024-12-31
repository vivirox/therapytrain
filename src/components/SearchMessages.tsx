import { FC, useState } from 'react';
import { supabase } from '../lib/supabase';

export const SearchMessages: FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<any>>([]);

  const handleSearch = async (query: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .textSearch('text', query)
      .order('timestamp', { ascending: false });

    setSearchResults(data || []);
  };

  return (
    <div className="p-4">
      <div className="relative">
        <input
          type="search"
          className="w-full p-2 pl-10 rounded-lg border"
          placeholder="Search messages..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            handleSearch(e.target.value);
          }}
        />
        <svg
          className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      
      {searchResults.length > 0 && (
        <div className="mt-4">
          {searchResults.map(message => (
            <div
              key={message.id}
              className="p-3 mb-2 rounded-lg bg-white shadow"
              onClick={() => {
                // Navigate to thread and highlight message
              }}
            >
              <p className="text-sm text-gray-600">
                {new Date(message.timestamp).toLocaleString()}
              </p>
              <p>{message.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
