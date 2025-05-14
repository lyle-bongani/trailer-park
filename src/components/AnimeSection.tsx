import React from 'react';
import { Anime } from '../types';
import AnimeCard from './AnimeCard';
import { Link } from 'react-router-dom';

interface AnimeSectionProps {
    title: string;
    animes: Anime[];
    isLoading: boolean;
    featured?: boolean;
    viewAllLink?: string;
}

const AnimeSection: React.FC<AnimeSectionProps> = ({
    title,
    animes,
    isLoading,
    featured = false,
    viewAllLink
}) => {
    const renderSkeleton = () => {
        const skeletonItems = Array(featured ? 3 : 6).fill(null);

        return skeletonItems.map((_, index) => (
            <div
                key={`skeleton-${index}`}
                className={`bg-tp-dark-gray rounded-md animate-pulse ${featured ? 'aspect-[16/9]' : 'aspect-[2/3]'}`}
            >
                <div className="w-full h-full bg-gradient-to-r from-tp-surface-dark to-tp-surface"></div>
            </div>
        ));
    };

    return (
        <section className="px-6 md:px-16 lg:px-24 py-6 mb-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-white text-xl md:text-2xl font-bold">{title}</h2>

                {animes.length > 0 && viewAllLink && (
                    <Link to={viewAllLink} className="text-tp-text-light hover:text-tp-green transition-colors text-sm">
                        See All
                    </Link>
                )}
            </div>

            <div className={`grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 
        ${featured ? 'md:grid-cols-2 lg:grid-cols-3' : ''}`}
            >
                {isLoading ? (
                    renderSkeleton()
                ) : (
                    animes.map(anime => (
                        <AnimeCard
                            key={anime.id}
                            anime={anime}
                            featured={featured}
                        />
                    ))
                )}
            </div>
        </section>
    );
};

export default AnimeSection; 