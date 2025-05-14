import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { searchAnime } from '../services/api';
import { Anime } from '../types';
import AnimeCard from './AnimeCard';
import LoadingSpinner from './LoadingSpinner';

// Helper function to convert AnimeTrailer to Anime type
const convertToAnime = (trailer: any): Anime => {
    return {
        id: parseInt(trailer.id),
        title: trailer.title,
        synopsis: trailer.description,
        image_url: trailer.thumbnail,
        cover_image: trailer.backgroundImage,
        score: parseFloat(trailer.rating),
        status: trailer.isNewRelease ? 'currently_airing' : 'finished_airing',
        genres: trailer.genres.map((name: string, index: number) => ({ id: index + 1, name })),
        year: trailer.year,
        num_episodes: trailer.episodes
    };
};

const AnimeSearch: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialQuery = searchParams.get('q') || '';
    
    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<Anime[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchPerformed, setSearchPerformed] = useState(false);

    // Perform search when URL query parameter changes
    useEffect(() => {
        if (initialQuery) {
            setQuery(initialQuery);
            fetchResults(initialQuery);
        }
    }, [initialQuery]);

    const fetchResults = async (term: string) => {
        try {
            setLoading(true);
            setError(null);
            
            const animeResults = await searchAnime(term);
            setResults(animeResults.map(convertToAnime));
            setSearchPerformed(true);
        } catch (err) {
            console.error('Error searching anime:', err);
            setError('Failed to search for anime. Please try again later.');
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            // Update URL with query parameter
            setSearchParams({ q: query.trim() });
            fetchResults(query.trim());
        }
    };

    return (
        <div className="pt-24 px-6 md:px-16 lg:px-24">
            <h1 className="text-3xl text-white font-bold mb-6">Search Anime</h1>
            
            <form onSubmit={handleSubmit} className="mb-8">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-grow relative">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search for anime titles..."
                            className="w-full bg-tp-dark-gray text-white py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-tp-green"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => setQuery('')}
                                className="absolute right-12 top-1/2 transform -translate-y-1/2 text-tp-text-light hover:text-white"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </button>
                        )}
                        <button
                            type="submit"
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-tp-green hover:text-tp-green-light"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </button>
                    </div>
                    <button
                        type="submit"
                        className="md:hidden flex items-center justify-center gap-2 px-6 py-3 bg-tp-green text-tp-black font-bold rounded-md hover:bg-tp-green-light transition-all"
                    >
                        Search
                    </button>
                </div>
            </form>
            
            {/* Results section */}
            {loading ? (
                <div className="py-12">
                    <LoadingSpinner />
                </div>
            ) : error ? (
                <div className="bg-red-900/30 text-red-200 p-4 rounded-md">
                    <p>{error}</p>
                </div>
            ) : searchPerformed ? (
                <>
                    <h2 className="text-white text-xl font-bold mb-4">
                        {results.length > 0 
                            ? `Found ${results.length} results for "${initialQuery}"`
                            : `No results found for "${initialQuery}"`}
                    </h2>
                    
                    {results.length > 0 && (
                        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                            {results.map(anime => (
                                <AnimeCard
                                    key={anime.id} 
                                    anime={anime}
                                />
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center text-tp-text-light py-12">
                    <p>Search for your favorite anime titles</p>
                </div>
            )}
        </div>
    );
};

export default AnimeSearch; 