import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Anime } from '../types';

interface AnimeCardProps {
    anime: Anime;
    featured?: boolean;
}

const AnimeCard: React.FC<AnimeCardProps> = ({ anime, featured = false }) => {
    const [isHovered, setIsHovered] = useState(false);

    const imageUrl = anime.image_url || 'https://via.placeholder.com/300x450?text=No+Image';

    return (
        <Link
            to={`/anime/${anime.id}`}
            className={`group relative block overflow-hidden rounded-md transition-all duration-300 
        ${featured ? 'aspect-[16/9]' : 'aspect-[2/3]'} 
        ${isHovered ? 'scale-105 z-50 shadow-card-hover' : 'shadow-card'}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Main image */}
            <div className="absolute inset-0 bg-tp-black">
                <img
                    src={imageUrl}
                    alt={anime.title}
                    className="w-full h-full object-cover transition-all duration-500"
                    loading="lazy"
                />
            </div>

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-card-fade opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            {/* Content overlay that appears on hover */}
            <div className="absolute inset-0 p-3 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <h3 className="text-white font-bold text-sm md:text-base line-clamp-2">{anime.title}</h3>

                <div className="flex items-center justify-between mt-1">
                    <span className="text-tp-green text-xs md:text-sm font-medium">
                        {anime.score ? `${anime.score}/10` : 'New'}
                    </span>

                    {anime.genres && anime.genres.length > 0 && (
                        <span className="text-tp-text-light text-xs truncate max-w-[70%]">
                            {anime.genres.slice(0, 2).map(g => g.name).join(' • ')}
                        </span>
                    )}
                </div>

                {/* Quick action buttons */}
                <div className={`flex gap-2 mt-2 ${featured ? '' : 'hidden md:flex'}`}>
                    <button
                        className="w-8 h-8 rounded-full bg-tp-green flex items-center justify-center text-tp-black hover:bg-tp-green-light transition-colors"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // Watch trailer logic here
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                    </button>

                    <button
                        className="w-8 h-8 rounded-full bg-tp-surface-light flex items-center justify-center text-white hover:bg-tp-surface transition-colors"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // Add to list logic here
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Badge for new releases if applicable */}
            {anime.status === 'currently_airing' && (
                <div className="absolute top-2 left-2 bg-tp-green px-2 py-0.5 rounded text-xs font-semibold text-tp-black">
                    NEW
                </div>
            )}
        </Link>
    );
};

export default AnimeCard; 