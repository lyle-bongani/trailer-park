import React, { useState, useEffect, useCallback } from 'react';
import { Anime } from '../types';
import { Link } from 'react-router-dom';

interface HeroBannerProps {
    anime: Anime | null;
    trendingAnime?: Anime[];
    isLoading: boolean;
}

const HeroBanner: React.FC<HeroBannerProps> = ({ anime, trendingAnime = [], isLoading }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [featuredAnimes, setFeaturedAnimes] = useState<Anime[]>([]);
    const [currentAnime, setCurrentAnime] = useState<Anime | null>(null);

    // Prepare the rotation list once when dependencies change
    useEffect(() => {
        if (isLoading) return;

        // Build the list of animes to rotate through
        let rotationList: Anime[] = [];

        // Add the primary featured anime if available
        if (anime) {
            rotationList.push(anime);
        }

        // Add top trending anime (exclude the featured one if it's already in trending)
        if (trendingAnime && trendingAnime.length > 0) {
            const filteredTrending = anime
                ? trendingAnime.filter(item => item.id !== anime.id).slice(0, 4)
                : trendingAnime.slice(0, 5);

            rotationList = [...rotationList, ...filteredTrending];
        }

        // Fallback if no anime available
        if (rotationList.length === 0 && anime) {
            rotationList = [anime];
        }

        setFeaturedAnimes(rotationList);
        setCurrentAnime(rotationList[0] || null);
    }, [anime, trendingAnime, isLoading]);

    // Function to rotate to the next anime
    const rotateAnime = useCallback((direction: 'next' | 'prev' = 'next') => {
        if (featuredAnimes.length <= 1) return;

        setIsTransitioning(true);

        // Wait for fade out animation to complete
        setTimeout(() => {
            setCurrentIndex(prevIndex => {
                let nextIndex;

                if (direction === 'next') {
                    nextIndex = (prevIndex + 1) % featuredAnimes.length;
                } else {
                    nextIndex = (prevIndex - 1 + featuredAnimes.length) % featuredAnimes.length;
                }

                setCurrentAnime(featuredAnimes[nextIndex]);
                return nextIndex;
            });

            // Wait a bit then remove the transitioning state (fade back in)
            setTimeout(() => {
                setIsTransitioning(false);
            }, 300);
        }, 500);
    }, [featuredAnimes]);

    // Set up interval for rotation
    useEffect(() => {
        if (isLoading || featuredAnimes.length <= 1) return;

        const interval = setInterval(() => {
            rotateAnime('next');
        }, 5000);

        return () => clearInterval(interval);
    }, [rotateAnime, isLoading, featuredAnimes.length]);

    // Function to navigate to a specific slide
    const goToSlide = useCallback((index: number) => {
        if (index === currentIndex || isTransitioning) return;

        setIsTransitioning(true);

        setTimeout(() => {
            setCurrentIndex(index);
            setCurrentAnime(featuredAnimes[index]);

            setTimeout(() => {
                setIsTransitioning(false);
            }, 300);
        }, 500);
    }, [currentIndex, featuredAnimes, isTransitioning]);

    if (isLoading || !currentAnime) {
        return (
            <div className="relative w-full h-[70vh] bg-tp-black flex items-center justify-center">
                <div className="animate-pulse-slow w-16 h-16 border-4 border-tp-green rounded-full border-t-transparent animate-spin"></div>
            </div>
        );
    }

    const bannerStyle = {
        backgroundImage: `url(${currentAnime.cover_image || currentAnime.image_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
    };

    return (
        <div className="relative w-full h-[70vh] overflow-hidden group">
            {/* Background image with transition and zoom effect */}
            <div
                className={`absolute inset-0 w-full h-full transition-all duration-700 ease-in-out ${isTransitioning ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
                    } animate-subtle-zoom`}
                style={bannerStyle}
            ></div>

            {/* Overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-tp-black via-tp-black/70 to-transparent z-10"></div>
            <div className="absolute inset-0 bg-hero-fade z-20"></div>

            {/* Content */}
            <div className={`absolute bottom-0 left-0 z-30 w-full h-full flex flex-col justify-center px-6 md:px-16 lg:px-24 transition-all duration-500 ease-in-out ${isTransitioning ? 'opacity-0 transform translate-y-10' : 'opacity-100 transform translate-y-0'
                }`}>
                <div className="max-w-2xl">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 line-clamp-2">
                        {currentAnime.title}
                    </h1>

                    <div className="flex items-center gap-4 mb-4">
                        <span className="text-tp-green font-semibold">
                            {currentAnime.score ? `${currentAnime.score}/10` : 'New Release'}
                        </span>
                        {currentAnime.start_season && (
                            <span className="text-tp-text-light">
                                {currentAnime.start_season.year} {currentAnime.start_season.season}
                            </span>
                        )}
                        {!currentAnime.start_season && currentAnime.year && (
                            <span className="text-tp-text-light">
                                {currentAnime.year}
                            </span>
                        )}
                        {currentAnime.genres && currentAnime.genres.length > 0 && (
                            <span className="text-tp-text-light hidden md:inline-block">
                                {currentAnime.genres.slice(0, 3).map(g => g.name).join(' • ')}
                            </span>
                        )}
                    </div>

                    <p className="text-tp-text-light mb-6 line-clamp-3 md:line-clamp-4 text-base md:text-lg max-w-4xl">
                        {currentAnime.synopsis || "No description available"}
                    </p>

                    <div className="flex flex-wrap gap-4">
                        <Link
                            to={`/anime/${currentAnime.id}`}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-tp-green text-tp-black font-bold rounded-md hover:bg-tp-green-light transition-all"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                            Watch Trailer
                        </Link>

                        <Link
                            to={`/anime/${currentAnime.id}`}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-tp-dark-gray text-white font-bold rounded-md hover:bg-tp-card-gray transition-all"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            More Info
                        </Link>
                    </div>
                </div>
            </div>

            {/* Left and Right Navigation Arrows (only visible on hover or for mobile) */}
            {featuredAnimes.length > 1 && (
                <>
                    <button
                        onClick={() => rotateAnime('prev')}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 z-40 bg-black/30 hover:bg-black/50 text-white rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 focus:outline-none focus:ring-2 focus:ring-tp-green hidden md:block"
                        aria-label="Previous anime"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <button
                        onClick={() => rotateAnime('next')}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 z-40 bg-black/30 hover:bg-black/50 text-white rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 focus:outline-none focus:ring-2 focus:ring-tp-green hidden md:block"
                        aria-label="Next anime"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </>
            )}

            {/* Carousel Indicators */}
            {featuredAnimes.length > 1 && (
                <div className="absolute bottom-6 left-0 w-full flex justify-center gap-2 z-40">
                    {featuredAnimes.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => goToSlide(index)}
                            className={`h-1.5 rounded-full transition-all duration-300 ${index === currentIndex
                                    ? 'w-8 bg-tp-green'
                                    : 'w-3 bg-white/50 hover:bg-white/70'
                                }`}
                            aria-label={`View anime ${index + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default HeroBanner; 