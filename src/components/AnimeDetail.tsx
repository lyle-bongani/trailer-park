import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Anime } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { fetchAnimeDetails } from '../services/api';

const AnimeDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [anime, setAnime] = useState<Anime | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadAnimeDetails = async () => {
            try {
                setLoading(true);

                if (!id) {
                    setError('No anime ID provided');
                    return;
                }

                // Convert string ID to number for the Anime type
                const numericId = parseInt(id);
                if (isNaN(numericId)) {
                    setError('Invalid anime ID');
                    return;
                }

                const details = await fetchAnimeDetails(id);
                if (!details) {
                    setError('Failed to load anime details');
                    return;
                }

                // Convert AnimeTrailer to Anime type
                const animeDetails: Anime = {
                    id: numericId,
                    title: details.title,
                    synopsis: details.description,
                    image_url: details.thumbnail,
                    cover_image: details.backgroundImage,
                    score: parseFloat(details.rating),
                    status: details.isNewRelease ? 'currently_airing' : 'finished_airing',
                    genres: details.genres.map((name, index) => ({ id: index + 1, name })),
                    year: details.year,
                    num_episodes: details.episodes
                };

                setAnime(animeDetails);
                setError(null);
            } catch (err) {
                console.error('Error loading anime details:', err);
                setError('An error occurred while loading anime details');
            } finally {
                setLoading(false);
            }
        };

        loadAnimeDetails();
    }, [id]);

    const goBack = () => {
        navigate(-1);
    };

    if (loading) {
        return <LoadingSpinner fullScreen />;
    }

    if (error || !anime) {
        return (
            <div className="pt-24 px-6 md:px-16 lg:px-24 flex flex-col items-center justify-center min-h-[50vh]">
                <h1 className="text-3xl text-tp-green font-bold mb-4">Error</h1>
                <p className="text-tp-text-light mb-6">{error || 'Failed to load anime details'}</p>
                <button
                    onClick={goBack}
                    className="px-6 py-3 bg-tp-surface-light text-white font-bold rounded-md hover:bg-tp-surface transition-all"
                >
                    Go Back
                </button>
            </div>
        );
    }

    const bannerStyle = {
        backgroundImage: `url(${anime.cover_image || anime.image_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
    };

    return (
        <div className="pt-16">
            {/* Hero Banner */}
            <div className="relative w-full h-[50vh] overflow-hidden" style={bannerStyle}>
                <div className="absolute inset-0 bg-gradient-to-r from-tp-black via-tp-black/70 to-transparent z-10"></div>
                <div className="absolute inset-0 bg-hero-fade z-20"></div>
            </div>

            {/* Content */}
            <div className="relative z-30 -mt-40 px-6 md:px-16 lg:px-24">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Poster */}
                    <div className="w-48 md:w-64 h-auto shrink-0 rounded-md overflow-hidden shadow-lg">
                        <img
                            src={anime.image_url || 'https://via.placeholder.com/300x450?text=No+Image'}
                            alt={anime.title}
                            className="w-full h-auto"
                        />
                    </div>

                    {/* Details */}
                    <div className="flex-1">
                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3">
                            {anime.title}
                        </h1>

                        <div className="flex flex-wrap items-center gap-4 mb-6">
                            {anime.score && (
                                <div className="flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-tp-green mr-1" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                    <span className="text-tp-green font-semibold">{anime.score} / 10</span>
                                </div>
                            )}

                            {anime.year && (
                                <span className="text-tp-text-light">{anime.year}</span>
                            )}

                            {anime.num_episodes && (
                                <span className="text-tp-text-light">{anime.num_episodes} Episodes</span>
                            )}

                            {anime.status && (
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${anime.status === 'currently_airing'
                                        ? 'bg-tp-green text-tp-black'
                                        : 'bg-tp-surface-light text-tp-text-light'
                                    }`}>
                                    {anime.status === 'currently_airing' ? 'Airing' : 'Completed'}
                                </span>
                            )}
                        </div>

                        {anime.genres && anime.genres.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-white text-lg font-semibold mb-2">Genres</h3>
                                <div className="flex flex-wrap gap-2">
                                    {anime.genres.map(genre => (
                                        <span
                                            key={genre.id}
                                            className="px-3 py-1 bg-tp-surface rounded-full text-sm text-tp-text-light"
                                        >
                                            {genre.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mb-6">
                            <h3 className="text-white text-lg font-semibold mb-2">Synopsis</h3>
                            <p className="text-tp-text-light">
                                {anime.synopsis || "No description available."}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-4 mt-8">
                            <button className="flex items-center justify-center gap-2 px-6 py-3 bg-tp-green text-tp-black font-bold rounded-md hover:bg-tp-green-light transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                </svg>
                                Watch Trailer
                            </button>

                            <button className="flex items-center justify-center gap-2 px-6 py-3 bg-tp-surface-light text-white font-bold rounded-md hover:bg-tp-surface transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                                Add to List
                            </button>

                            <button
                                onClick={goBack}
                                className="flex items-center justify-center gap-2 px-6 py-3 border border-tp-text-light text-tp-text-light font-bold rounded-md hover:text-white hover:border-white transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                                </svg>
                                Go Back
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Related Content Section */}
            <div className="mt-16 px-6 md:px-16 lg:px-24">
                <h2 className="text-2xl font-bold text-white mb-4">You May Also Like</h2>
                <div className="text-center text-tp-text-light py-8">
                    <p>Recommendations are not available for this anime.</p>
                </div>
            </div>
        </div>
    );
};

export default AnimeDetail; 