import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Header: React.FC = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isDesktopSearchOpen, setIsDesktopSearchOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 20) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close mobile menu and search when changing routes
    useEffect(() => {
        setIsMobileMenuOpen(false);
        setIsSearchOpen(false);
        setIsDesktopSearchOpen(false);
    }, [location]);

    // Add keyboard shortcut for search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Open search when slash key is pressed, but not when typing in input fields
            if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
                e.preventDefault();
                if (window.innerWidth >= 768) {
                    setIsDesktopSearchOpen(true);
                } else {
                    setIsSearchOpen(true);
                }
            }

            // Close search when Escape key is pressed
            if (e.key === 'Escape') {
                setIsDesktopSearchOpen(false);
                setIsSearchOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const navLinks = [
        { name: 'Home', path: '/' },
        {
            name: 'All Anime',
            path: '/anime',
            tooltip: 'Access the full MyAnimeList catalog',
            highlight: true
        },
        { name: 'New Releases', path: '/new-releases' },
        { name: 'Top Rated', path: '/top-rated' },
        { name: 'Genres', path: '/genres' }
    ];

    const isActive = (path: string) => {
        return location.pathname === path;
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
            setIsSearchOpen(false);
            setIsDesktopSearchOpen(false);
            setSearchQuery("");
        }
    };

    return (
        <header
            className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-tp-black/95 backdrop-blur-sm shadow-lg' : 'bg-gradient-to-b from-tp-black to-transparent'
                }`}
        >
            <div className="px-6 md:px-16 lg:px-24 py-4 flex items-center justify-between">
                {/* Logo */}
                <Link to="/" className="flex items-center">
                    <h1 className="text-tp-green text-xl md:text-2xl font-bold">
                        TrailerPark
                        <span className="text-white ml-1">Anime</span>
                    </h1>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center space-x-8">
                    {navLinks.map((link) => (
                        <div key={link.path} className="relative group">
                            <Link
                                to={link.path}
                                className={`text-sm transition-colors ${isActive(link.path)
                                    ? 'text-tp-green font-semibold'
                                    : link.highlight
                                        ? 'text-tp-green-light hover:text-tp-green font-semibold'
                                        : 'text-tp-text-light hover:text-white'
                                    }`}
                            >
                                {link.name}
                                {link.highlight && !isActive(link.path) && (
                                    <span className="absolute -top-1 -right-2 flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tp-green opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-tp-green"></span>
                                    </span>
                                )}
                            </Link>
                            {link.tooltip && (
                                <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-10 hidden group-hover:block bg-tp-dark-gray text-white text-xs py-1 px-2 rounded whitespace-nowrap">
                                    {link.tooltip}
                                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-tp-dark-gray rotate-45"></div>
                                </div>
                            )}
                        </div>
                    ))}
                </nav>

                {/* Right side buttons */}
                <div className="flex items-center space-x-4">
                    {/* Desktop Search */}
                    <div className="hidden md:flex items-center">
                        {isDesktopSearchOpen ? (
                            <div className="relative">
                                <form onSubmit={handleSearchSubmit} className="relative">
                                    <input
                                        type="text"
                                        placeholder="Search for anime..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-64 bg-tp-dark-gray text-white py-2 px-4 pr-10 rounded-md focus:outline-none focus:ring-2 focus:ring-tp-green"
                                        autoFocus
                                    />
                                    <button
                                        type="submit"
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-tp-green"
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-5 w-5"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </button>
                                </form>
                                <div className="absolute right-0 -bottom-6 text-xs text-tp-text-light whitespace-nowrap">
                                    Press <span className="text-tp-green font-medium">Esc</span> to close
                                </div>
                            </div>
                        ) : (
                            <div className="relative group">
                                <button
                                    onClick={() => setIsDesktopSearchOpen(true)}
                                    className="text-tp-text-light hover:text-tp-green transition-colors"
                                    aria-label="Open search"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-6 w-6"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                        />
                                    </svg>
                                </button>
                                <div className="absolute right-0 -bottom-10 hidden group-hover:block bg-tp-dark-gray text-white text-xs py-1 px-2 rounded whitespace-nowrap">
                                    Search <span className="text-tp-green">(Press /)</span>
                                    <div className="absolute -top-1 right-4 transform w-2 h-2 bg-tp-dark-gray rotate-45"></div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Mobile search button */}
                    <div className="relative group md:hidden">
                        <button
                            onClick={() => setIsSearchOpen(!isSearchOpen)}
                            className="text-tp-text-light hover:text-tp-green transition-colors"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-6 w-6"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                />
                            </svg>
                        </button>
                        <div className="absolute right-0 -bottom-10 hidden group-hover:block bg-tp-dark-gray text-white text-xs py-1 px-2 rounded whitespace-nowrap">
                            Search <span className="text-tp-green">(Press /)</span>
                            <div className="absolute -top-1 right-4 transform w-2 h-2 bg-tp-dark-gray rotate-45"></div>
                        </div>
                    </div>

                    {/* Profile */}
                    <Link to="/profile" className="hidden md:block">
                        <div className="h-8 w-8 rounded-full bg-tp-green text-tp-black flex items-center justify-center font-bold">
                            A
                        </div>
                    </Link>

                    {/* Mobile menu toggle */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="text-tp-text-light hover:text-tp-green md:hidden transition-colors"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            {isMobileMenuOpen ? (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            ) : (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 6h16M4 12h16M4 18h16"
                                />
                            )}
                        </svg>
                    </button>
                </div>
            </div>

            {/* Mobile Search bar */}
            <div
                className={`md:hidden transition-all duration-300 overflow-hidden ${isSearchOpen ? 'h-20' : 'h-0'
                    }`}
            >
                <div className="px-6 md:px-16 lg:px-24 py-3">
                    <form onSubmit={handleSearchSubmit} className="relative">
                        <input
                            type="text"
                            placeholder="Search for anime..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-tp-dark-gray text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-tp-green"
                            autoFocus={isSearchOpen}
                        />
                        <button
                            type="submit"
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-tp-green"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </button>
                        <div className="text-xs text-tp-text-light mt-1 pl-1">
                            Press <span className="text-tp-green font-medium">Esc</span> to close, <span className="text-tp-green font-medium">/</span> to open search anytime
                        </div>
                    </form>
                </div>
            </div>

            {/* Mobile menu */}
            <div
                className={`md:hidden transition-all duration-300 overflow-hidden ${isMobileMenuOpen ? 'max-h-96' : 'max-h-0'
                    }`}
            >
                <nav className="bg-tp-black/95 backdrop-blur-sm px-6 py-4 flex flex-col space-y-4">
                    {navLinks.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={`transition-colors ${isActive(link.path)
                                ? 'text-tp-green font-semibold'
                                : link.highlight
                                    ? 'text-tp-green-light hover:text-tp-green font-semibold flex items-center'
                                    : 'text-tp-text-light hover:text-white'
                                }`}
                        >
                            {link.name}
                            {link.highlight && !isActive(link.path) && (
                                <span className="ml-2 flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-tp-green opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-tp-green"></span>
                                </span>
                            )}
                            {link.tooltip && !isActive(link.path) && (
                                <span className="ml-2 text-xs text-tp-text-light">
                                    ({link.tooltip})
                                </span>
                            )}
                        </Link>
                    ))}
                    <Link to="/search" className="text-tp-text-light hover:text-white transition-colors">
                        Search
                    </Link>
                </nav>
            </div>
        </header>
    );
};

export default Header; 