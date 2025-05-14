import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
    const year = new Date().getFullYear();

    const footerLinks = [
        {
            title: 'Navigation',
            links: [
                { name: 'Home', path: '/' },
                { name: 'Anime', path: '/anime' },
                { name: 'New Releases', path: '/new-releases' },
                { name: 'Top Rated', path: '/top-rated' },
                { name: 'Genres', path: '/genres' }
            ],
        },
        {
            title: 'Information',
            links: [
                { name: 'About Us', path: '/about' },
                { name: 'Privacy Policy', path: '/privacy' },
                { name: 'Terms of Service', path: '/terms' },
                { name: 'Contact Us', path: '/contact' },
            ],
        },
        {
            title: 'Follow Us',
            links: [
                { name: 'Twitter', path: 'https://twitter.com' },
                { name: 'Instagram', path: 'https://instagram.com' },
                { name: 'Discord', path: 'https://discord.com' },
                { name: 'YouTube', path: 'https://youtube.com' },
            ],
        },
    ];

    return (
        <footer className="bg-tp-black mt-16 pt-12 pb-8 border-t border-tp-surface">
            <div className="px-6 md:px-16 lg:px-24">
                {/* Footer top section */}
                <div className="flex flex-col md:flex-row justify-between mb-12">
                    {/* Logo and tagline */}
                    <div className="mb-8 md:mb-0">
                        <Link to="/" className="inline-block mb-3">
                            <h1 className="text-tp-green text-2xl font-bold">
                                TrailerPark
                                <span className="text-white ml-1">Anime</span>
                            </h1>
                        </Link>
                        <p className="text-tp-text-light max-w-xs">
                            Your ultimate destination for discovering the latest and greatest anime trailers and previews.
                        </p>
                    </div>

                    {/* Footer links */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                        {footerLinks.map((section, index) => (
                            <div key={`footer-section-${index}`}>
                                <h3 className="text-white font-semibold mb-4">{section.title}</h3>
                                <ul className="space-y-2">
                                    {section.links.map((link, linkIndex) => (
                                        <li key={`footer-link-${index}-${linkIndex}`}>
                                            {link.path.startsWith('http') ? (
                                                <a
                                                    href={link.path}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-tp-text-light hover:text-tp-green transition-colors"
                                                >
                                                    {link.name}
                                                </a>
                                            ) : (
                                                <Link
                                                    to={link.path}
                                                    className="text-tp-text-light hover:text-tp-green transition-colors"
                                                >
                                                    {link.name}
                                                </Link>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer bottom section */}
                <div className="pt-8 border-t border-tp-surface text-center">
                    <p className="text-tp-text-light text-sm">
                        &copy; {year} TrailerPark Anime. All rights reserved.
                    </p>
                    <p className="text-tp-text-light text-xs mt-2">
                        TrailerPark Anime is not affiliated with MyAnimeList, Crunchyroll, or any anime studios. This is a fan-made project.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer; 