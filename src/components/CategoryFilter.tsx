import React, { useRef, useState, useEffect } from 'react';
import { Genre } from '../types';

interface CategoryFilterProps {
    genres: Genre[];
    selectedGenreId: number | null;
    onSelectGenre: (genreId: number | null) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
    genres,
    selectedGenreId,
    onSelectGenre
}) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [showLeftScroll, setShowLeftScroll] = useState(false);
    const [showRightScroll, setShowRightScroll] = useState(false);

    // Check if scrolling is needed
    useEffect(() => {
        const checkScroll = () => {
            if (scrollContainerRef.current) {
                const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
                setShowLeftScroll(scrollLeft > 20);
                setShowRightScroll(scrollLeft + clientWidth < scrollWidth - 20);
            }
        };

        checkScroll();
        window.addEventListener('resize', checkScroll);

        // Store ref value in a variable to use in cleanup
        const currentRef = scrollContainerRef.current;
        if (currentRef) {
            currentRef.addEventListener('scroll', checkScroll);
        }

        return () => {
            window.removeEventListener('resize', checkScroll);
            if (currentRef) {
                currentRef.removeEventListener('scroll', checkScroll);
            }
        };
    }, [genres]);

    const scrollRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
        }
    };

    const scrollLeft = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
        }
    };

    if (!genres || genres.length === 0) {
        return null;
    }

    return (
        <div className="relative px-6 md:px-16 lg:px-24 mt-4">
            {/* Left scroll button */}
            {showLeftScroll && (
                <button
                    onClick={scrollLeft}
                    className="absolute left-2 md:left-10 lg:left-16 top-1/2 -translate-y-1/2 z-10 bg-tp-black/80 rounded-full p-2 text-white hover:bg-tp-green hover:text-tp-black transition-colors"
                    aria-label="Scroll left"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                </button>
            )}

            {/* Categories */}
            <div
                ref={scrollContainerRef}
                className="flex space-x-3 overflow-x-auto py-4 hide-scrollbar"
            >
                {/* All category */}
                <button
                    onClick={() => onSelectGenre(null)}
                    className={`shrink-0 px-4 py-2 rounded-full ${selectedGenreId === null
                        ? 'bg-tp-green text-tp-black font-semibold'
                        : 'bg-tp-surface text-tp-text-light hover:bg-tp-surface-light'
                        } transition-colors`}
                >
                    All
                </button>

                {/* Genre categories */}
                {genres.map(genre => (
                    <button
                        key={genre.id}
                        onClick={() => onSelectGenre(genre.id)}
                        className={`shrink-0 px-4 py-2 rounded-full ${selectedGenreId === genre.id
                            ? 'bg-tp-green text-tp-black font-semibold'
                            : 'bg-tp-surface text-tp-text-light hover:bg-tp-surface-light'
                            } transition-colors`}
                    >
                        {genre.name}
                    </button>
                ))}
            </div>

            {/* Right scroll button */}
            {showRightScroll && (
                <button
                    onClick={scrollRight}
                    className="absolute right-2 md:right-10 lg:right-16 top-1/2 -translate-y-1/2 z-10 bg-tp-black/80 rounded-full p-2 text-white hover:bg-tp-green hover:text-tp-black transition-colors"
                    aria-label="Scroll right"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                </button>
            )}
        </div>
    );
};

export default CategoryFilter; 