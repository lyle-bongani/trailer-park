import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMockData, fetchTrendingAnime, fetchNewReleases, AnimeTrailer } from '../services/api';
import { Anime } from '../types';
import AnimeSection from './AnimeSection';
import HeroBanner from './HeroBanner';
import LoadingSpinner from './LoadingSpinner';
import CategoryFilter from './CategoryFilter';

// Helper function to convert AnimeTrailer to Anime type
const convertToAnime = (trailer: AnimeTrailer): Anime => {
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

const Home: React.FC = () => {
    // State for different anime categories
    const [featuredAnime, setFeaturedAnime] = useState<AnimeTrailer | null>(null);
    const [trendingAnime, setTrendingAnime] = useState<AnimeTrailer[]>([]);
    const [newReleases, setNewReleases] = useState<AnimeTrailer[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [isMockData, setIsMockData] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Genres for filtering
    const [genres, setGenres] = useState<{ id: number; name: string }[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

    const navigate = useNavigate();

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);
                setIsMockData(false);

                // Load data using the mock API service
                const mockAPI = fetchMockData();

                // Attempt to fetch real data
                let trending: AnimeTrailer[] = [];
                let newReleasesData: AnimeTrailer[] = [];

                try {
                    // Fetch trending anime
                    trending = await fetchTrendingAnime(12);

                    // Fetch new releases
                    newReleasesData = await fetchNewReleases(12);

                    // If we're here, we have real data
                    // Check if any IDs contain underscores (mock data indicator)
                    if (trending.length > 0 && trending[0].id.includes('_')) {
                        setIsMockData(true);
                    }
                } catch (err) {
                    console.error('Failed to fetch real data, falling back to mock:', err);
                    setIsMockData(true);

                    // Fallback to mock data
                    trending = (await mockAPI.fetchTrendingTrailers()).slice(0, 12);
                    newReleasesData = (await mockAPI.fetchNewReleases()).slice(0, 12);
                }

                // Set trending anime
                setTrendingAnime(trending);

                // Set new releases
                setNewReleases(newReleasesData);

                // Set featured anime (first trending anime)
                if (trending.length > 0) {
                    setFeaturedAnime(trending[0]);
                } else {
                    // Fallback to mock featured trailer
                    const featured = await mockAPI.fetchFeaturedTrailer();
                    setFeaturedAnime(featured);
                    setIsMockData(true);
                }

                // Extract genres from trending and new releases for filtering
                const genreSet = new Set<string>();
                [...trending, ...newReleasesData].forEach(anime => {
                    anime.genres.forEach(genre => {
                        genreSet.add(genre);
                    });
                });

                // Convert to the format needed for the CategoryFilter
                const genreArray = Array.from(genreSet).map((name, index) => ({
                    id: index + 1,
                    name: name.charAt(0).toUpperCase() + name.slice(1) // Capitalize
                }));

                setGenres(genreArray);
            } catch (err) {
                console.error('Error loading data:', err);
                setError('Failed to load anime data. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const handleGenreSelect = (genreId: number | null) => {
        setSelectedCategory(genreId);

        if (genreId !== null) {
            // Find the genre name for the URL
            const genre = genres.find(g => g.id === genreId);
            if (genre) {
                navigate(`/anime?genre=${genreId}`);
            }
        }
    };

    // Filter anime by selected category
    const getFilteredAnime = (animeList: AnimeTrailer[]): AnimeTrailer[] => {
        if (!selectedCategory) return animeList;

        const selectedGenre = genres.find(g => g.id === selectedCategory);
        if (!selectedGenre) return animeList;

        return animeList.filter(anime =>
            anime.genres.includes(selectedGenre.name.toLowerCase())
        );
    };

    // Convert AnimeTrailer arrays to Anime arrays for components
    const convertTrailersToAnime = (trailers: AnimeTrailer[]): Anime[] => {
        return trailers.map(convertToAnime);
    };

    return (
        <div className="pt-16">
            {loading ? (
                <div className="flex justify-center items-center min-h-screen">
                    <LoadingSpinner />
                </div>
            ) : error ? (
                <div className="container mx-auto px-4 py-8">
                    <div className="bg-red-900/30 text-red-200 p-4 rounded-md">
                        <p>{error}</p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Hero Banner */}
                    {featuredAnime && (
                        <HeroBanner
                            anime={convertToAnime(featuredAnime)}
                            trendingAnime={convertTrailersToAnime(trendingAnime.slice(0, 5))}
                            isLoading={loading}
                        />
                    )}

                    <div className="container mx-auto px-4 pt-8">
                        {/* Mock data notice */}
                        {isMockData && (
                            <div className="mb-8 bg-tp-green/10 text-tp-green p-4 rounded-md">
                                <div className="flex items-start gap-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                        <p className="font-medium">Using Mock Data</p>
                                        <p className="text-sm opacity-80 mt-1">
                                            You're currently seeing mock anime data. To see real data from MyAnimeList,
                                            <a href="https://myanimelist.net/apiconfig" target="_blank" rel="noopener noreferrer" className="underline hover:text-white ml-1">
                                                get an API Client ID
                                            </a> and add it to your <code className="bg-tp-black/30 px-1 py-0.5 rounded">.env</code> file.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Genre Filter */}
                        {genres.length > 0 && (
                            <div className="mb-8">
                                <h2 className="text-2xl text-white font-bold mb-4">Categories</h2>
                                <CategoryFilter
                                    genres={genres}
                                    selectedGenreId={selectedCategory}
                                    onSelectGenre={handleGenreSelect}
                                />
                            </div>
                        )}

                        {/* Trending Anime Section */}
                        {getFilteredAnime(trendingAnime).length > 0 && (
                            <AnimeSection
                                title="Trending Now"
                                animes={convertTrailersToAnime(getFilteredAnime(trendingAnime))}
                                isLoading={loading}
                                viewAllLink="/anime?sort=anime_num_list_users"
                            />
                        )}

                        {/* New Releases Section */}
                        {getFilteredAnime(newReleases).length > 0 && (
                            <AnimeSection
                                title="New Releases"
                                animes={convertTrailersToAnime(getFilteredAnime(newReleases))}
                                isLoading={loading}
                                viewAllLink="/anime?status=currently_airing"
                            />
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default Home; 