import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { fetchMockData, fetchGenres, AnimeTrailer } from './services/api';
import { Anime, Genre } from './types';

// Import components
import Header from './components/Header';
import HeroBanner from './components/HeroBanner';
import AnimeSection from './components/AnimeSection';
import CategoryFilter from './components/CategoryFilter';
import Footer from './components/Footer';
import LoadingSpinner from './components/LoadingSpinner';
import AnimeDetail from './components/AnimeDetail';
import AnimeSearch from './components/AnimeSearch';
import AnimeLibrary from './components/AnimeLibrary';

// Convert AnimeTrailer to Anime type
const convertToAnime = (trailer: AnimeTrailer): Anime => {
    return {
        id: parseInt(trailer.id),
        title: trailer.title,
        synopsis: trailer.description,
        image_url: trailer.thumbnail,
        cover_image: trailer.backgroundImage,
        score: parseFloat(trailer.rating),
        status: trailer.isNewRelease ? 'currently_airing' : 'finished_airing',
        genres: trailer.genres.map((name, index) => ({ id: index + 1, name })),
        year: trailer.year,
        num_episodes: trailer.episodes
    };
};

const App: React.FC = () => {
    // State for anime data
    const [featuredAnime, setFeaturedAnime] = useState<Anime | null>(null);
    const [trendingAnime, setTrendingAnime] = useState<Anime[]>([]);
    const [newReleases, setNewReleases] = useState<Anime[]>([]);
    const [topRatedAnime, setTopRatedAnime] = useState<Anime[]>([]);

    // State for UI
    const [loading, setLoading] = useState(true);
    const [isMockData, setIsMockData] = useState(false);
    const [selectedGenreId, setSelectedGenreId] = useState<number | null>(null);
    const [genres, setGenres] = useState<Genre[]>([]);

    // Handler for genre selection
    const handleGenreSelect = (genreId: number | null) => {
        setSelectedGenreId(genreId);
    };

    // Filter anime by selected genre
    const filterAnimeByGenre = (animeList: Anime[]) => {
        if (!selectedGenreId) return animeList;

        return animeList.filter(anime =>
            anime.genres && anime.genres.some(genre => genre.id === selectedGenreId)
        );
    };

    // Load data on component mount
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                setIsMockData(false);

                // Initialize the data service
                const dataService = fetchMockData();

                // Fetch all data in parallel
                const [featured, trending, newReleaseData, genreData] = await Promise.all([
                    dataService.fetchFeaturedTrailer(),
                    dataService.fetchTrendingTrailers(),
                    dataService.fetchNewReleases(),
                    fetchGenres()
                ]);

                // Check if we're using mock data
                if (trending.length > 0 && trending[0].id.includes('_')) {
                    setIsMockData(true);
                }

                // Convert and set state with fetched data
                setFeaturedAnime(featured ? convertToAnime(featured) : null);
                setTrendingAnime(trending.map(convertToAnime));
                setNewReleases(newReleaseData.map(convertToAnime));

                // Calculate top rated animes based on score and convert
                const sortedByRating = [...trending]
                    .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
                    .slice(0, 12)
                    .map(convertToAnime);

                setTopRatedAnime(sortedByRating);

                // Extract unique genres from all anime data and create the Genre objects
                const allGenreNames = new Set<string>();
                [...trending, ...newReleaseData].forEach(anime => {
                    anime.genres.forEach(genre => allGenreNames.add(genre));
                });

                const uniqueGenres: Genre[] = Array.from(allGenreNames).map((name, index) => ({
                    id: index + 1,
                    name
                }));

                // Combine with genres from the API if available
                setGenres(genreData && Array.isArray(genreData) ?
                    [...uniqueGenres, ...(genreData as Genre[])] : uniqueGenres);
            } catch (error) {
                console.error('Failed to load anime data:', error);
                setIsMockData(true);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    return (
        <Router>
            <div className="flex flex-col min-h-screen bg-tp-black">
                <Header />

                <main className="flex-grow pt-16"> {/* pt-16 to account for fixed header */}
                    <Routes>
                        <Route path="/" element={
                            <>
                                {/* Hero Banner */}
                                <HeroBanner
                                    anime={featuredAnime}
                                    trendingAnime={trendingAnime}
                                    isLoading={loading}
                                />

                                {/* Mock data notice */}
                                {!loading && isMockData && (
                                    <div className="container mx-auto px-4 mt-4">
                                        <div className="bg-tp-green/10 text-tp-green p-4 rounded-md">
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
                                    </div>
                                )}

                                {/* Category Filter */}
                                {!loading && genres.length > 0 && (
                                    <CategoryFilter
                                        genres={genres}
                                        selectedGenreId={selectedGenreId}
                                        onSelectGenre={handleGenreSelect}
                                    />
                                )}

                                {/* Main Content */}
                                <div className="mt-4 pb-8">
                                    {/* Featured Anime Section */}
                                    <AnimeSection
                                        title="Featured Anime"
                                        animes={filterAnimeByGenre(trendingAnime.slice(0, 3))}
                                        isLoading={loading}
                                        featured={true}
                                    />

                                    {/* Trending Section */}
                                    <AnimeSection
                                        title="Trending Now"
                                        animes={filterAnimeByGenre(trendingAnime)}
                                        isLoading={loading}
                                    />

                                    {/* New Releases Section */}
                                    <AnimeSection
                                        title="New Releases"
                                        animes={filterAnimeByGenre(newReleases)}
                                        isLoading={loading}
                                    />

                                    {/* Top Rated Section */}
                                    <AnimeSection
                                        title="Top Rated"
                                        animes={filterAnimeByGenre(topRatedAnime)}
                                        isLoading={loading}
                                    />
                                </div>
                            </>
                        } />

                        {/* Anime Details Page */}
                        <Route path="/anime/:id" element={<AnimeDetail />} />

                        {/* Anime Search Page */}
                        <Route path="/search" element={<AnimeSearch />} />

                        {/* All Anime Library with advanced filtering */}
                        <Route path="/anime" element={<AnimeLibrary />} />

                        <Route path="/new-releases" element={
                            <div className="container mx-auto px-4 pt-24">
                                <h1 className="text-3xl text-white font-bold mb-6">New Releases</h1>

                                {/* Mock data notice */}
                                {isMockData && (
                                    <div className="mb-6 bg-tp-green/10 text-tp-green p-4 rounded-md">
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

                                <CategoryFilter
                                    genres={genres}
                                    selectedGenreId={selectedGenreId}
                                    onSelectGenre={handleGenreSelect}
                                />
                                <AnimeSection
                                    title="Latest Anime"
                                    animes={filterAnimeByGenre(newReleases)}
                                    isLoading={loading}
                                />
                            </div>
                        } />

                        <Route path="/top-rated" element={
                            <div className="container mx-auto px-4 pt-24">
                                <h1 className="text-3xl text-white font-bold mb-6">Top Rated Anime</h1>

                                {/* Mock data notice */}
                                {isMockData && (
                                    <div className="mb-6 bg-tp-green/10 text-tp-green p-4 rounded-md">
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

                                <CategoryFilter
                                    genres={genres}
                                    selectedGenreId={selectedGenreId}
                                    onSelectGenre={handleGenreSelect}
                                />
                                <AnimeSection
                                    title="Highest Rated"
                                    animes={filterAnimeByGenre(topRatedAnime)}
                                    isLoading={loading}
                                />
                            </div>
                        } />

                        <Route path="*" element={
                            <div className="flex items-center justify-center h-[70vh]">
                                <div className="text-center">
                                    <h1 className="text-3xl text-tp-green font-bold mb-4">Page Not Found</h1>
                                    <p className="text-white mb-8">The page you are looking for doesn't exist or has been moved.</p>
                                </div>
                            </div>
                        } />
                    </Routes>
                </main>

                <Footer />

                {/* Global loading overlay */}
                {loading && <LoadingSpinner fullScreen />}
            </div>
        </Router>
    );
};

export default App;