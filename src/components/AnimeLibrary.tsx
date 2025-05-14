import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchAllAnime, fetchGenres, SortOption, PaginatedResponse, AnimeTrailer } from '../services/api';
import { Anime, Genre } from '../types';
import LoadingSpinner from './LoadingSpinner';
import AnimeCard from './AnimeCard';
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

// Available sort options
const sortOptions: { label: string; value: SortOption }[] = [
    { label: 'Score', value: 'anime_score' },
    { label: 'Popularity', value: 'anime_num_list_users' },
    { label: 'Release Date', value: 'start_date' },
    { label: 'Title', value: 'title' },
    { label: 'Rank', value: 'rank' }
];

// Status filter options
const statusOptions = [
    { label: 'All', value: '' },
    { label: 'Airing', value: 'currently_airing' },
    { label: 'Finished', value: 'finished_airing' },
    { label: 'Not Yet Aired', value: 'not_yet_aired' }
];

const AnimeLibrary: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    // Parse URL parameters with defaults
    const initialPage = parseInt(searchParams.get('page') || '1');
    const initialSort = (searchParams.get('sort') as SortOption) || 'anime_score';
    const initialSortDir = (searchParams.get('dir') as 'asc' | 'desc') || 'desc';
    const initialGenre = searchParams.get('genre') ? parseInt(searchParams.get('genre') || '0') : undefined;
    const initialStatus = searchParams.get('status') || '';

    // State for anime data and UI
    const [animeList, setAnimeList] = useState<Anime[]>([]);
    const [paginationData, setPaginationData] = useState<{ currentPage: number; lastPage: number }>({
        currentPage: initialPage,
        lastPage: initialPage
    });
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isMockData, setIsMockData] = useState<boolean>(false);
    const [genres, setGenres] = useState<Genre[]>([]);

    // State for filters
    const [page, setPage] = useState<number>(initialPage);
    const [sort, setSort] = useState<SortOption>(initialSort);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>(initialSortDir);
    const [selectedGenre, setSelectedGenre] = useState<number | undefined>(initialGenre);
    const [status, setStatus] = useState<string>(initialStatus);

    // Handle URL parameter changes
    useEffect(() => {
        const newPage = parseInt(searchParams.get('page') || '1');
        const newSort = searchParams.get('sort') as SortOption || 'anime_score';
        const newSortDir = searchParams.get('dir') as 'asc' | 'desc' || 'desc';
        const newGenre = searchParams.get('genre') ? parseInt(searchParams.get('genre') || '0') : undefined;
        const newStatus = searchParams.get('status') || '';

        setPage(newPage);
        setSort(newSort);
        setSortDir(newSortDir);
        setSelectedGenre(newGenre);
        setStatus(newStatus);
    }, [searchParams]);

    // Fetch genres once on component mount
    useEffect(() => {
        const loadGenres = async () => {
            try {
                const genreData = await fetchGenres();
                setGenres(genreData);
            } catch (err) {
                console.error('Failed to load genres:', err);
            }
        };

        loadGenres();
    }, []);

    // Fetch anime when filters change
    useEffect(() => {
        const loadAnimeData = async () => {
            try {
                setLoading(true);
                setError(null);
                setIsMockData(false);

                console.log('Fetching anime with params:', { page, sort, sortDir, selectedGenre, status });
                const response: PaginatedResponse<AnimeTrailer> = await fetchAllAnime(
                    page,
                    24, // Items per page
                    sort,
                    sortDir,
                    selectedGenre,
                    status
                );

                if (response.data.length > 0 && response.data[0].id.includes('_')) {
                    // If the ID contains an underscore, it's likely mock data
                    setIsMockData(true);
                }

                setAnimeList(response.data.map(convertToAnime));
                setPaginationData({
                    currentPage: response.currentPage,
                    lastPage: response.lastPage
                });
            } catch (err) {
                console.error('Failed to load anime:', err);
                setError('Failed to load anime. Please try again later.');
                setAnimeList([]);
            } finally {
                setLoading(false);
            }
        };

        // Update URL parameters
        const params: { [key: string]: string } = { page: page.toString() };
        if (sort !== 'anime_score') params.sort = sort;
        if (sortDir !== 'desc') params.dir = sortDir;
        if (selectedGenre) params.genre = selectedGenre.toString();
        if (status) params.status = status;

        setSearchParams(params);

        loadAnimeData();
    }, [page, sort, sortDir, selectedGenre, status, setSearchParams]);

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        window.scrollTo(0, 0);
    };

    const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSort(e.target.value as SortOption);
        setPage(1); // Reset to first page when changing sort
    };

    const handleSortDirChange = () => {
        setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
        setPage(1); // Reset to first page when changing sort direction
    };

    const handleGenreSelect = (genreId: number | null) => {
        setSelectedGenre(genreId || undefined);
        setPage(1); // Reset to first page when changing genre
    };

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setStatus(e.target.value);
        setPage(1); // Reset to first page when changing status
    };

    // Generate pagination buttons
    const renderPagination = () => {
        const { currentPage, lastPage } = paginationData;
        const pageButtons = [];

        // Previous button
        pageButtons.push(
            <button
                key="prev"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`rounded-md px-3 py-1 mx-1 ${currentPage === 1
                    ? 'bg-tp-dark-gray text-tp-text-light cursor-not-allowed'
                    : 'bg-tp-green text-tp-black hover:bg-tp-green-light'}`}
            >
                Previous
            </button>
        );

        // First page
        if (currentPage > 3) {
            pageButtons.push(
                <button
                    key={1}
                    onClick={() => handlePageChange(1)}
                    className={`rounded-md px-3 py-1 mx-1 ${currentPage === 1
                        ? 'bg-tp-green-light text-tp-black font-bold'
                        : 'bg-tp-dark-gray text-white hover:bg-tp-dark-gray/80'}`}
                >
                    1
                </button>
            );

            // Ellipsis if needed
            if (currentPage > 4) {
                pageButtons.push(
                    <span key="ellipsis1" className="mx-1 text-tp-text-light">...</span>
                );
            }
        }

        // Pages around current
        for (let i = Math.max(1, currentPage - 2); i <= Math.min(lastPage, currentPage + 2); i++) {
            pageButtons.push(
                <button
                    key={i}
                    onClick={() => handlePageChange(i)}
                    className={`rounded-md px-3 py-1 mx-1 ${i === currentPage
                        ? 'bg-tp-green-light text-tp-black font-bold'
                        : 'bg-tp-dark-gray text-white hover:bg-tp-dark-gray/80'}`}
                >
                    {i}
                </button>
            );
        }

        // Ellipsis if needed
        if (currentPage < lastPage - 3) {
            pageButtons.push(
                <span key="ellipsis2" className="mx-1 text-tp-text-light">...</span>
            );

            // Last page
            pageButtons.push(
                <button
                    key={lastPage}
                    onClick={() => handlePageChange(lastPage)}
                    className={`rounded-md px-3 py-1 mx-1 ${currentPage === lastPage
                        ? 'bg-tp-green-light text-tp-black font-bold'
                        : 'bg-tp-dark-gray text-white hover:bg-tp-dark-gray/80'}`}
                >
                    {lastPage}
                </button>
            );
        }

        // Next button
        pageButtons.push(
            <button
                key="next"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === lastPage}
                className={`rounded-md px-3 py-1 mx-1 ${currentPage === lastPage
                    ? 'bg-tp-dark-gray text-tp-text-light cursor-not-allowed'
                    : 'bg-tp-green text-tp-black hover:bg-tp-green-light'}`}
            >
                Next
            </button>
        );

        return pageButtons;
    };

    return (
        <div className="pt-24 px-6 md:px-16 lg:px-24 pb-12">
            <h1 className="text-3xl text-white font-bold mb-6">Anime Library</h1>

            {/* Filter controls */}
            <div className="mb-8 bg-tp-darker/60 p-4 rounded-lg">
                <h2 className="text-xl text-white font-semibold mb-4">Filter and Sort</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* Sort dropdown */}
                    <div>
                        <label htmlFor="sort" className="block text-tp-text-light mb-2">Sort By</label>
                        <div className="flex items-center">
                            <select
                                id="sort"
                                value={sort}
                                onChange={handleSortChange}
                                className="bg-tp-black text-white px-3 py-2 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-tp-green"
                            >
                                {sortOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>

                            <button
                                onClick={handleSortDirChange}
                                className="ml-2 bg-tp-dark-gray p-2 rounded-md hover:bg-tp-dark-gray/80"
                                title={sortDir === 'desc' ? 'Descending order' : 'Ascending order'}
                            >
                                {sortDir === 'desc' ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Status filter */}
                    <div>
                        <label htmlFor="status" className="block text-tp-text-light mb-2">Status</label>
                        <select
                            id="status"
                            value={status}
                            onChange={handleStatusChange}
                            className="bg-tp-black text-white px-3 py-2 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-tp-green"
                        >
                            {statusOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Genre filter */}
                {genres.length > 0 && (
                    <div>
                        <label className="block text-tp-text-light mb-2">Genres</label>
                        <CategoryFilter
                            genres={genres}
                            selectedGenreId={selectedGenre || null}
                            onSelectGenre={handleGenreSelect}
                        />
                    </div>
                )}
            </div>

            {/* Mock data notice */}
            {isMockData && (
                <div className="mb-4 bg-tp-green/10 text-tp-green p-4 rounded-md">
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

            {/* Results section */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <LoadingSpinner />
                </div>
            ) : error ? (
                <div className="bg-red-900/30 text-red-200 p-4 rounded-md">
                    <p>{error}</p>
                </div>
            ) : (
                <>
                    {/* Results count */}
                    <div className="mb-4 text-tp-text-light">
                        {animeList.length > 0 ? (
                            <p>
                                Page {paginationData.currentPage} of {paginationData.lastPage}
                                {' | '}
                                Showing {animeList.length} anime
                            </p>
                        ) : (
                            <p>No anime found matching your criteria. Try adjusting your filters.</p>
                        )}
                    </div>

                    {/* Results grid */}
                    {animeList.length > 0 && (
                        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                            {animeList.map(anime => (
                                <AnimeCard
                                    key={anime.id}
                                    anime={anime}
                                />
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {animeList.length > 0 && (
                        <div className="mt-8 flex flex-wrap justify-center">
                            {renderPagination()}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AnimeLibrary; 