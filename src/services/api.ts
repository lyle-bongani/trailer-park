// MyAnimeList API service
// You'll need to register for a MyAnimeList API client ID: https://myanimelist.net/apiconfig
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// Add explicit console log to help debug the issue
console.log('API Client ID:', process.env.REACT_APP_MAL_CLIENT_ID ? 'CONFIGURED ✓' : 'NOT CONFIGURED ✗');

// Check if we have a valid client ID
const MAL_CLIENT_ID = process.env.REACT_APP_MAL_CLIENT_ID || 'YOUR_MAL_CLIENT_ID'; // Set your client ID in .env file
const IS_USING_MOCK = MAL_CLIENT_ID === 'YOUR_MAL_CLIENT_ID' || MAL_CLIENT_ID === 'your_client_id_here';

if (IS_USING_MOCK) {
    console.warn('------------------------------------------------------------');
    console.warn('| MyAnimeList API Client ID not configured in .env file    |');
    console.warn('| Using mock data instead of real API calls                |');
    console.warn('| Get your client ID at: https://myanimelist.net/apiconfig |');
    console.warn('------------------------------------------------------------');
}

const MAL_BASE_URL = 'https://api.myanimelist.net/v2';
const IMAGE_PLACEHOLDER = 'https://via.placeholder.com/225x319?text=No+Image';

// Create an Axios instance with default config
const malApi: AxiosInstance = axios.create({
    baseURL: MAL_BASE_URL,
    headers: {
        'X-MAL-CLIENT-ID': MAL_CLIENT_ID,
        'Accept': 'application/json'
    }
});

// Add response interceptor for error handling
malApi.interceptors.response.use(
    response => response,
    error => {
        console.error('API request failed:', error.response?.status || error.message);
        if (error.response?.status === 401 || error.response?.status === 403) {
            console.warn('Authentication error - check your MAL API Client ID');
        }
        return Promise.reject(error);
    }
);

// Types
export interface AnimeTrailer {
    id: string;
    title: string;
    description: string;
    shortDescription: string;
    thumbnail: string;
    backgroundImage: string;
    videoUrl?: string;
    year: number;
    rating: string;
    episodes?: number;
    genres: string[];
    isNewRelease: boolean;
    isTrending: boolean;
}

export interface Genre {
    id: number;
    name: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    paging: {
        next?: string;
        previous?: string;
    };
    total?: number;
    currentPage: number;
    lastPage: number;
}

export type SortOption = 'anime_score' | 'anime_num_list_users' | 'start_date' | 'title' | 'rank';

// Helper function to make requests to MAL API
const fetchFromMAL = async (endpoint: string, params = {}) => {
    // If we're using mock data, don't even try to make the API call
    if (IS_USING_MOCK) {
        throw new Error('MOCK_MODE_ENABLED');
    }

    try {
        const config: AxiosRequestConfig = {
            params
        };

        const response = await malApi.get(endpoint, config);
        return response.data;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
};

// Function to fetch anime details
export const fetchAnimeDetails = async (id: string): Promise<AnimeTrailer | null> => {
    try {
        // Check if it's a mock ID (contains underscore)
        if (id.includes('_')) {
            // Find the corresponding mock item
            const baseId = id.split('_')[0];
            const mockItem = mockTrailers.find(item => item.id === baseId);
            if (mockItem) {
                return { ...mockItem, id };
            }
        }

        const data = await fetchFromMAL(`/anime/${id}`, {
            fields: 'id,title,main_picture,alternative_titles,start_date,end_date,synopsis,mean,rank,popularity,num_episodes,media_type,status,genres,my_list_status,num_list_users,pictures,background,related_anime,related_manga,recommendations,studios,statistics'
        });

        // Determine if it's a new release
        const isNewRelease = isNewReleaseCheck(data.start_date);

        // Determine if it's trending based on popularity
        const isTrending = data.popularity <= 100; // Top 100 most popular

        // Convert ratings from 0-10 to 0-10 scale (MAL uses 0-10)
        const rating = data.mean ? data.mean.toFixed(1) : 'N/A';

        // Year from start_date
        const year = data.start_date ? new Date(data.start_date).getFullYear() : new Date().getFullYear();

        // Get best quality image
        const thumbnail = data.main_picture?.large || data.main_picture?.medium || IMAGE_PLACEHOLDER;

        // If available use a picture for background, otherwise use poster
        const backgroundImage = data.pictures && data.pictures.length > 0
            ? data.pictures[0].large || data.pictures[0].medium
            : thumbnail;

        // Extract genres
        const genres = data.genres ? data.genres.map((genre: any) => genre.name.toLowerCase()) : [];

        // Create the AnimeTrailer object with information from MAL
        const animeTrailer: AnimeTrailer = {
            id: data.id.toString(),
            title: data.title,
            description: data.synopsis || 'No description available.',
            shortDescription: data.synopsis ? data.synopsis.substring(0, 100) + '...' : 'No description available.',
            thumbnail,
            backgroundImage,
            videoUrl: undefined, // MAL API doesn't provide trailer URLs directly
            year,
            rating,
            episodes: data.num_episodes || 0,
            genres,
            isNewRelease,
            isTrending
        };

        return animeTrailer;
    } catch (error) {
        console.error(`Failed to fetch anime details for ID ${id}:`, error);

        // If it's a real ID (doesn't contain underscore)
        if (!id.includes('_')) {
            // Try to find a mock item with similar ID
            const potentialMock = mockTrailers.find(item => parseInt(item.id) === parseInt(id));
            if (potentialMock) {
                return potentialMock;
            }
        }

        return null;
    }
};

// Function to fetch anime list
export const fetchAnimeList = async (page = 1, limit = 20): Promise<AnimeTrailer[]> => {
    try {
        if (IS_USING_MOCK) {
            console.log('Using mock data for fetchAnimeList');
            return mockTrailers.slice(0, limit);
        }

        const data = await fetchFromMAL('/anime/ranking', {
            ranking_type: 'all',
            limit,
            offset: (page - 1) * limit,
            fields: 'id,title,main_picture,alternative_titles,start_date,end_date,synopsis,mean,rank,popularity,num_episodes,media_type,status,genres,num_list_users'
        });

        return data.data.map((item: any) => convertToAnimeTrailer(item.node));
    } catch (error) {
        console.error('Failed to fetch anime list:', error);
        console.log('Falling back to mock data');
        return mockTrailers.slice(0, limit);
    }
};

// Function to fetch ALL anime with various filtering options
export const fetchAllAnime = async (
    page = 1,
    limit = 24,
    sort: SortOption = 'anime_score',
    sortDirection: 'desc' | 'asc' = 'desc',
    genre?: number,
    status?: string,
    minScore?: number,
    maxScore?: number,
    season?: string,
    year?: number
): Promise<PaginatedResponse<AnimeTrailer>> => {
    try {
        // Check if we have a valid client ID, otherwise use mock data
        if (IS_USING_MOCK) {
            console.log('Using mock data for fetchAllAnime due to missing CLIENT_ID');
            return getMockPaginatedAnime(page, limit, genre, status);
        }

        // Build query parameters
        const params: any = {
            limit,
            offset: (page - 1) * limit,
            fields: 'id,title,main_picture,alternative_titles,start_date,end_date,synopsis,mean,rank,popularity,num_episodes,media_type,status,genres,num_list_users',
            sort: sort + (sortDirection === 'desc' ? '' : '_asc')
        };

        // Add optional filters if provided
        if (genre) params.genre = genre;
        if (status) params.status = status;
        if (minScore) params.min_score = minScore;
        if (maxScore) params.max_score = maxScore;
        if (season && year) {
            params.season = season;
            params.year = year;
        }

        // Make the API request
        const data = await fetchFromMAL('/anime', params);

        // Calculate pagination information
        const nextUrl = data.paging?.next || '';
        const hasNext = !!nextUrl;

        // Extract page number from next URL if available
        let lastPage = page;
        if (hasNext) {
            const nextOffset = new URLSearchParams(new URL(nextUrl).search).get('offset');
            if (nextOffset) {
                const totalItems = parseInt(nextOffset) + limit;
                lastPage = Math.ceil(totalItems / limit);
            } else {
                lastPage = page + 1;
            }
        }

        // Map the data to our format
        const animeList = data.data.map((item: any) => convertToAnimeTrailer(item.node));

        return {
            data: animeList,
            paging: data.paging,
            currentPage: page,
            lastPage: hasNext ? lastPage : page
        };
    } catch (error) {
        console.error('Failed to fetch all anime:', error);
        console.log('Falling back to mock data after API error');

        // Return mock data as a fallback when the API fails
        return getMockPaginatedAnime(page, limit, genre, status);
    }
};

// Helper function to generate mock paginated data
const getMockPaginatedAnime = (
    page = 1,
    limit = 24,
    genreId?: number,
    status?: string
): PaginatedResponse<AnimeTrailer> => {
    // Filter by genre if provided
    let filteredAnime = [...mockTrailers];

    if (genreId) {
        filteredAnime = mockTrailers.filter(anime =>
            anime.genres.some(genre => {
                // Since our mock data uses string genres and the filter uses IDs,
                // we'll do a rough mapping based on common genre names
                const genreMap: { [key: number]: string[] } = {
                    1: ['action'],
                    2: ['adventure'],
                    3: ['comedy'],
                    4: ['drama'],
                    5: ['slice of life'],
                    6: ['fantasy'],
                    7: ['magic'],
                    8: ['supernatural'],
                    9: ['horror'],
                    10: ['mystery'],
                    11: ['psychological'],
                    12: ['romance'],
                    13: ['sci-fi'],
                    14: ['mecha'],
                    15: ['sports'],
                    16: ['music'],
                    17: ['shounen'],
                    18: ['shoujo'],
                    19: ['seinen'],
                    20: ['josei'],
                };

                return genreMap[genreId]?.some(g => genre.includes(g));
            })
        );
    }

    // Filter by status if provided
    if (status) {
        filteredAnime = filteredAnime.filter(anime => {
            if (status === 'currently_airing') {
                return anime.isNewRelease;
            } else if (status === 'finished_airing') {
                return !anime.isNewRelease;
            }
            return true; // For 'all' or unknown status
        });
    }

    // If no results after filtering, return all
    if (filteredAnime.length === 0) {
        filteredAnime = [...mockTrailers];
    }

    // Create sufficient mock data by duplicating what we have
    const expandedMockData: AnimeTrailer[] = [];
    const totalItemsNeeded = page * limit + limit; // Current page + next page

    while (expandedMockData.length < totalItemsNeeded) {
        const nextBatch = filteredAnime.map((anime, index) => ({
            ...anime,
            id: `${anime.id}_${expandedMockData.length + index}`, // Ensure unique IDs
            title: expandedMockData.length > 0 ? `${anime.title} ${Math.ceil(expandedMockData.length / filteredAnime.length)}` : anime.title
        }));
        expandedMockData.push(...nextBatch);
    }

    // Paginate the data
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = expandedMockData.slice(startIndex, endIndex);

    // Calculate total pages
    const totalPages = Math.ceil(expandedMockData.length / limit);

    return {
        data: paginatedData,
        paging: {
            next: page < totalPages ? `mock_next_page_${page + 1}` : undefined,
            previous: page > 1 ? `mock_previous_page_${page - 1}` : undefined
        },
        currentPage: page,
        lastPage: totalPages
    };
};

// Function to fetch trending anime
export const fetchTrendingAnime = async (limit = 20): Promise<AnimeTrailer[]> => {
    try {
        if (IS_USING_MOCK) {
            console.log('Using mock data for fetchTrendingAnime');
            return mockTrailers.filter(t => t.isTrending).slice(0, limit);
        }

        const data = await fetchFromMAL('/anime/ranking', {
            ranking_type: 'bypopularity',
            limit,
            fields: 'id,title,main_picture,alternative_titles,start_date,end_date,synopsis,mean,rank,popularity,num_episodes,media_type,status,genres,num_list_users'
        });

        return data.data.map((item: any) => {
            const trailer = convertToAnimeTrailer(item.node);
            trailer.isTrending = true;
            return trailer;
        });
    } catch (error) {
        console.error('Failed to fetch trending anime:', error);
        return mockTrailers.filter(t => t.isTrending).slice(0, limit);
    }
};

// Function to fetch new releases
export const fetchNewReleases = async (limit = 20): Promise<AnimeTrailer[]> => {
    try {
        if (IS_USING_MOCK) {
            console.log('Using mock data for fetchNewReleases');
            return mockTrailers.filter(t => t.isNewRelease).slice(0, limit);
        }

        const data = await fetchFromMAL('/anime/ranking', {
            ranking_type: 'airing',
            limit,
            fields: 'id,title,main_picture,alternative_titles,start_date,end_date,synopsis,mean,rank,popularity,num_episodes,media_type,status,genres,num_list_users'
        });

        return data.data.map((item: any) => {
            const trailer = convertToAnimeTrailer(item.node);
            trailer.isNewRelease = true;
            return trailer;
        });
    } catch (error) {
        console.error('Failed to fetch new releases:', error);
        return mockTrailers.filter(t => t.isNewRelease).slice(0, limit);
    }
};

// Function to fetch genres
export const fetchGenres = async (): Promise<Genre[]> => {
    // MAL doesn't have a direct endpoint for genres, so we'll use a predefined list
    // based on common anime genres from MyAnimeList
    const genres: Genre[] = [
        { id: 1, name: 'Action' },
        { id: 2, name: 'Adventure' },
        { id: 3, name: 'Comedy' },
        { id: 4, name: 'Drama' },
        { id: 5, name: 'Slice of Life' },
        { id: 6, name: 'Fantasy' },
        { id: 7, name: 'Magic' },
        { id: 8, name: 'Supernatural' },
        { id: 9, name: 'Horror' },
        { id: 10, name: 'Mystery' },
        { id: 11, name: 'Psychological' },
        { id: 12, name: 'Romance' },
        { id: 13, name: 'Sci-Fi' },
        { id: 14, name: 'Mecha' },
        { id: 15, name: 'Sports' },
        { id: 16, name: 'Music' },
        { id: 17, name: 'Shounen' },
        { id: 18, name: 'Shoujo' },
        { id: 19, name: 'Seinen' },
        { id: 20, name: 'Josei' }
    ];

    return genres;
};

// Function to search for anime
export const searchAnime = async (query: string, limit = 20): Promise<AnimeTrailer[]> => {
    try {
        if (!query) return [];

        if (IS_USING_MOCK) {
            console.log('Using mock data for searchAnime');
            const lowerQuery = query.toLowerCase();
            return mockTrailers
                .filter(anime =>
                    anime.title.toLowerCase().includes(lowerQuery) ||
                    anime.description.toLowerCase().includes(lowerQuery) ||
                    anime.genres.some(genre => genre.includes(lowerQuery))
                )
                .slice(0, limit);
        }

        const data = await fetchFromMAL('/anime', {
            q: query,
            limit,
            fields: 'id,title,main_picture,alternative_titles,start_date,end_date,synopsis,mean,rank,popularity,num_episodes,media_type,status,genres,num_list_users'
        });

        return data.data.map((item: any) => convertToAnimeTrailer(item.node));
    } catch (error) {
        console.error('Failed to search anime:', error);

        // Fallback to searching in mock data
        const lowerQuery = query.toLowerCase();
        return mockTrailers
            .filter(anime =>
                anime.title.toLowerCase().includes(lowerQuery) ||
                anime.description.toLowerCase().includes(lowerQuery) ||
                anime.genres.some(genre => genre.includes(lowerQuery))
            )
            .slice(0, limit);
    }
};

// Helper function to convert MAL anime data to AnimeTrailer format
const convertToAnimeTrailer = (anime: any): AnimeTrailer => {
    // Check if it's a new release (within the last 3 months)
    const isNewReleaseValue = isNewReleaseCheck(anime.start_date);

    // Determine if it's trending based on popularity
    const isTrendingValue = anime.popularity <= 200; // Top 200 most popular

    return {
        id: anime.id.toString(),
        title: anime.title,
        description: anime.synopsis || 'No description available.',
        shortDescription: anime.synopsis ? anime.synopsis.substring(0, 100) + '...' : 'No description available.',
        thumbnail: anime.main_picture?.large || anime.main_picture?.medium || IMAGE_PLACEHOLDER,
        backgroundImage: anime.main_picture?.large || anime.main_picture?.medium || IMAGE_PLACEHOLDER,
        year: anime.start_date ? new Date(anime.start_date).getFullYear() : new Date().getFullYear(),
        rating: anime.mean ? anime.mean.toFixed(1) : 'N/A',
        episodes: anime.num_episodes || 0,
        genres: anime.genres ? anime.genres.map((genre: any) => genre.name.toLowerCase()) : [],
        isNewRelease: isNewReleaseValue,
        isTrending: isTrendingValue
    };
};

// Helper function to check if a release date is considered "new" (within the last 3 months)
const isNewReleaseCheck = (releaseDate: string): boolean => {
    if (!releaseDate) return false;

    const animeDate = new Date(releaseDate);
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    return animeDate >= threeMonthsAgo;
};

// Export a default mock function for testing purposes when the API is not available
export const fetchMockData = () => {
    return {
        fetchFeaturedTrailer: async (): Promise<AnimeTrailer> => {
            try {
                const trending = await fetchTrendingAnime(1);
                return trending[0] || mockTrailers[0];
            } catch {
                return mockTrailers[0];
            }
        },
        fetchTrendingTrailers: async (): Promise<AnimeTrailer[]> => {
            try {
                const trending = await fetchTrendingAnime();
                return trending.length > 0 ? trending : mockTrailers.filter(t => t.isTrending);
            } catch {
                return mockTrailers.filter(t => t.isTrending);
            }
        },
        fetchNewReleases: async (): Promise<AnimeTrailer[]> => {
            try {
                const newReleases = await fetchNewReleases();
                return newReleases.length > 0 ? newReleases : mockTrailers.filter(t => t.isNewRelease);
            } catch {
                return mockTrailers.filter(t => t.isNewRelease);
            }
        }
    };
};

// Mock data for fallback
const mockTrailers: AnimeTrailer[] = [
    {
        id: '1535',
        title: 'Death Note',
        description: 'A shinigami, as a god of death, can kill anyone—provided they see their victim\'s face and write their victim\'s name in a notebook called a Death Note. One day, Ryuk, bored by the shinigami lifestyle and interested in seeing how a human would use a Death Note, drops one into the human realm.',
        shortDescription: 'A high school student discovers a supernatural notebook that grants its user the ability to kill.',
        thumbnail: 'https://cdn.myanimelist.net/images/anime/9/9453l.jpg',
        backgroundImage: 'https://cdn.myanimelist.net/images/anime/9/9453l.jpg',
        videoUrl: '/videos/death-note-trailer.mp4',
        year: 2006,
        rating: '8.6',
        episodes: 37,
        genres: ['mystery', 'psychological', 'supernatural', 'thriller'],
        isNewRelease: false,
        isTrending: true
    },
    {
        id: '16498',
        title: 'Attack on Titan',
        description: 'Centuries ago, mankind was slaughtered to near extinction by monstrous humanoid creatures called Titans, forcing humans to hide in fear behind enormous concentric walls. What makes these giants truly terrifying is that their taste for human flesh is not born out of hunger but what appears to be out of pleasure.',
        shortDescription: 'Humans are nearly extinct, living behind walls protecting them from giant humanoid Titans.',
        thumbnail: 'https://cdn.myanimelist.net/images/anime/10/47347l.jpg',
        backgroundImage: 'https://cdn.myanimelist.net/images/anime/10/47347l.jpg',
        videoUrl: '/videos/aot-trailer.mp4',
        year: 2013,
        rating: '8.5',
        episodes: 25,
        genres: ['action', 'drama', 'fantasy'],
        isNewRelease: false,
        isTrending: true
    },
    {
        id: '1575',
        title: 'Code Geass: Lelouch of the Rebellion',
        description: 'In the year 2010, the Holy Empire of Britannia is establishing itself as a dominant military nation, starting with the conquest of Japan. Renamed to Area 11 after its swift defeat, Japan has seen significant resistance against these tyrants in an attempt to regain independence.',
        shortDescription: 'An exiled prince gains the power of absolute obedience to take down the Britannian Empire.',
        thumbnail: 'https://cdn.myanimelist.net/images/anime/5/50331l.jpg',
        backgroundImage: 'https://cdn.myanimelist.net/images/anime/5/50331l.jpg',
        videoUrl: '/videos/code-geass-trailer.mp4',
        year: 2006,
        rating: '8.7',
        episodes: 25,
        genres: ['action', 'drama', 'mecha', 'sci-fi', 'thriller'],
        isNewRelease: false,
        isTrending: true
    },
    {
        id: '52991',
        title: 'Sousou no Frieren',
        description: 'The demon king has been defeated, and the victorious hero party returns home before disbanding. The four—mage Frieren, hero Himmel, priest Heiter, and warrior Eisen—reminisce about their decade-long journey as the moment to bid each other farewell arrives. But the passing of time is different for elves, thus Frieren witnesses her companions slowly pass away one by one.',
        shortDescription: 'After the defeat of the demon king, elf mage Frieren embarks on a journey of remembrance.',
        thumbnail: 'https://cdn.myanimelist.net/images/anime/1015/138006l.jpg',
        backgroundImage: 'https://cdn.myanimelist.net/images/anime/1015/138006l.jpg',
        videoUrl: '/videos/frieren-trailer.mp4',
        year: 2023,
        rating: '9.0',
        episodes: 28,
        genres: ['adventure', 'drama', 'fantasy'],
        isNewRelease: true,
        isTrending: true
    },
    {
        id: '51009',
        title: 'Jujutsu Kaisen 2nd Season',
        description: 'The second season of Jujutsu Kaisen, covering the "Kaigyoku/Gyokusetsu" arc and the "Shibuya Incident" arc.',
        shortDescription: 'The story of Jujutsu Kaisen continues, covering the "Shibuya Incident" arc.',
        thumbnail: 'https://cdn.myanimelist.net/images/anime/1792/138022l.jpg',
        backgroundImage: 'https://cdn.myanimelist.net/images/anime/1792/138022l.jpg',
        videoUrl: '/videos/jjk-s2-trailer.mp4',
        year: 2023,
        rating: '8.7',
        episodes: 23,
        genres: ['action', 'fantasy'],
        isNewRelease: true,
        isTrending: true
    },
    {
        id: '9969',
        title: 'Fullmetal Alchemist: Brotherhood',
        description: 'After a horrific alchemy experiment goes wrong in the Elric household, brothers Edward and Alphonse are left in a catastrophic situation. Trying to resurrect their mother, Edward loses his arm and leg, and Alphonse loses his entire body. Now Edward joins the military to search for the philosopher\'s stone to restore their bodies.',
        shortDescription: 'Two brothers search for the Philosopher\'s Stone to restore their bodies after a failed alchemical ritual.',
        thumbnail: 'https://cdn.myanimelist.net/images/anime/1223/96541l.jpg',
        backgroundImage: 'https://cdn.myanimelist.net/images/anime/1223/96541l.jpg',
        videoUrl: '/videos/fmab-trailer.mp4',
        year: 2009,
        rating: '9.1',
        episodes: 64,
        genres: ['action', 'adventure', 'drama', 'fantasy'],
        isNewRelease: false,
        isTrending: true
    },
    {
        id: '30276',
        title: 'One Punch Man',
        description: 'Saitama has a rather peculiar hobby, being a hero. In order to pursue his childhood dream, Saitama relentlessly trained for three years, losing all of his hair in the process. Now, Saitama is so powerful, he can defeat any enemy with just one punch. However, having no one capable of matching his strength has led Saitama to an unexpected problem—he is no longer able to enjoy the thrill of battling and has become quite bored.',
        shortDescription: 'A superhero who can defeat any opponent with a single punch seeks a worthy opponent after growing bored with his powers.',
        thumbnail: 'https://cdn.myanimelist.net/images/anime/12/76049l.jpg',
        backgroundImage: 'https://cdn.myanimelist.net/images/anime/12/76049l.jpg',
        videoUrl: '/videos/one-punch-man-trailer.mp4',
        year: 2015,
        rating: '8.5',
        episodes: 12,
        genres: ['action', 'comedy', 'sci-fi', 'supernatural'],
        isNewRelease: false,
        isTrending: true
    },
    {
        id: '1735',
        title: 'Naruto: Shippuuden',
        description: 'It has been two and a half years since Naruto Uzumaki left Konohagakure, the Hidden Leaf Village, for intense training following events which fueled his desire to be stronger. Now Akatsuki, the mysterious organization of elite rogue ninja, is closing in on their grand plan which may threaten the safety of the entire shinobi world.',
        shortDescription: 'After training for two years, Naruto returns to face new challenges and the looming threat of the Akatsuki.',
        thumbnail: 'https://cdn.myanimelist.net/images/anime/5/17407l.jpg',
        backgroundImage: 'https://cdn.myanimelist.net/images/anime/5/17407l.jpg',
        videoUrl: '/videos/naruto-shippuden-trailer.mp4',
        year: 2007,
        rating: '8.2',
        episodes: 500,
        genres: ['action', 'adventure', 'comedy', 'shounen'],
        isNewRelease: false,
        isTrending: true
    },
    {
        id: '55644',
        title: 'Blue Lock: Second Season',
        description: 'Second season of Blue Lock.',
        shortDescription: 'The intense race to become Japan\'s striker continues in the second season.',
        thumbnail: 'https://cdn.myanimelist.net/images/anime/1332/139398l.jpg',
        backgroundImage: 'https://cdn.myanimelist.net/images/anime/1332/139398l.jpg',
        videoUrl: '/videos/blue-lock-s2-trailer.mp4',
        year: 2024,
        rating: '8.4',
        episodes: 13,
        genres: ['sports', 'drama', 'shounen'],
        isNewRelease: true,
        isTrending: true
    },
    {
        id: '55644',
        title: 'Solo Leveling',
        description: 'In a world where hunters — humans who possess magical abilities — must battle deadly monsters to protect humanity, Sung Jinwoo is known as the "World\'s Weakest Hunter." Jinwoo is the laughingstock of the entire hunter community, and is considered too weak to join elite guilds. However, a mysterious System chooses him as its sole player.',
        shortDescription: 'The world\'s weakest hunter is granted a mysterious opportunity to level up in a way no other hunter can.',
        thumbnail: 'https://cdn.myanimelist.net/images/anime/1823/132323l.jpg',
        backgroundImage: 'https://cdn.myanimelist.net/images/anime/1823/132323l.jpg',
        videoUrl: '/videos/solo-leveling-trailer.mp4',
        year: 2024,
        rating: '8.5',
        episodes: 12,
        genres: ['action', 'adventure', 'fantasy'],
        isNewRelease: true,
        isTrending: true
    },
    {
        id: '813',
        title: 'Dragon Ball Z',
        description: 'Five years after winning the World Martial Arts tournament, Goku is now living a peaceful life with his wife and son. This changes, however, with the arrival of a mysterious enemy named Raditz who presents himself as Goku\'s long-lost brother. He reveals that Goku is a warrior from the once powerful but now virtually extinct Saiyan race.',
        shortDescription: 'Goku and his friends defend Earth from various threats including aliens, androids, and other cosmic entities.',
        thumbnail: 'https://cdn.myanimelist.net/images/anime/1607/117271l.jpg',
        backgroundImage: 'https://cdn.myanimelist.net/images/anime/1607/117271l.jpg',
        videoUrl: '/videos/dragon-ball-z-trailer.mp4',
        year: 1989,
        rating: '8.2',
        episodes: 291,
        genres: ['action', 'adventure', 'fantasy', 'martial arts', 'shounen'],
        isNewRelease: false,
        isTrending: false
    },
    {
        id: '19815',
        title: 'No Game No Life',
        description: 'Genius gamer siblings Sora and Shiro are shut-ins who are known in the online gaming world as "Blank," an undefeatable duo. One day, they are challenged to a chess match by Tet, a god from another reality. The two win, and are offered the opportunity to live in a world that centers around games.',
        shortDescription: 'Two genius gamer siblings are transported to a world where all conflicts are resolved through games.',
        thumbnail: 'https://cdn.myanimelist.net/images/anime/1074/111944l.jpg',
        backgroundImage: 'https://cdn.myanimelist.net/images/anime/1074/111944l.jpg',
        videoUrl: '/videos/no-game-no-life-trailer.mp4',
        year: 2014,
        rating: '8.1',
        episodes: 12,
        genres: ['adventure', 'comedy', 'fantasy', 'ecchi'],
        isNewRelease: false,
        isTrending: false
    },
    {
        id: '22199',
        title: 'Akame ga Kill!',
        description: 'Tatsumi is a self-acknowledged country bumpkin who travels to the Capital to raise money for his impoverished village. After being robbed and left stranded, he is recruited by Night Raid, a group of assassins dedicated to eliminating corruption by mercilessly killing those responsible.',
        shortDescription: 'A young man joins an assassin group to fight against a corrupt empire.',
        thumbnail: 'https://cdn.myanimelist.net/images/anime/1429/95946l.jpg',
        backgroundImage: 'https://cdn.myanimelist.net/images/anime/1429/95946l.jpg',
        videoUrl: '/videos/akame-ga-kill-trailer.mp4',
        year: 2014,
        rating: '7.5',
        episodes: 24,
        genres: ['action', 'adventure', 'drama', 'fantasy', 'horror'],
        isNewRelease: false,
        isTrending: false
    },
    {
        id: '40028',
        title: 'Shingeki no Kyojin: The Final Season',
        description: 'The war for Paradis zeroes in on Shiganshina just as Jaegerists have seized control. After taking a huge blow from a surprise attack led by Eren, Marley swiftly acts to return the favor. With Zeke\'s true plan revealed and a military forced under new rule, this battle might be fought on two fronts.',
        shortDescription: 'Eren leads the charge against Marley as the war intensifies and truths are revealed.',
        thumbnail: 'https://cdn.myanimelist.net/images/anime/1000/110531l.jpg',
        backgroundImage: 'https://cdn.myanimelist.net/images/anime/1000/110531l.jpg',
        videoUrl: '/videos/aot-final-season-trailer.mp4',
        year: 2020,
        rating: '8.8',
        episodes: 16,
        genres: ['action', 'drama', 'mystery', 'fantasy'],
        isNewRelease: false,
        isTrending: true
    },
    {
        id: '23755',
        title: 'Nanatsu no Taizai',
        description: 'The "Seven Deadly Sins," a group of evil knights who conspired to overthrow the kingdom of Britannia, were said to have been eradicated by the Holy Knights. However, rumors persist that these legendary knights still live. Princess Elizabeth seeks their help to defeat the Holy Knights, who have staged a coup.',
        shortDescription: 'A princess seeks the help of legendary knights to reclaim her kingdom from corrupt Holy Knights.',
        thumbnail: 'https://cdn.myanimelist.net/images/anime/8/65409l.jpg',
        backgroundImage: 'https://cdn.myanimelist.net/images/anime/8/65409l.jpg',
        videoUrl: '/videos/seven-deadly-sins-trailer.mp4',
        year: 2014,
        rating: '7.9',
        episodes: 24,
        genres: ['action', 'adventure', 'fantasy', 'magic', 'shounen'],
        isNewRelease: false,
        isTrending: false
    },
    {
        id: '54970',
        title: 'Delicious in Dungeon',
        description: 'After losing his fortune and sister to a dungeon, hunter Laios and his party of companions journey into the dungeon to continue the search and rescue. With no money for rations, they\'ll have to consume what lurks beneath — the monsters themselves!',
        shortDescription: 'A group of adventurers explores a deadly dungeon while cooking and eating the monsters they defeat.',
        thumbnail: 'https://cdn.myanimelist.net/images/anime/1208/139312l.jpg',
        backgroundImage: 'https://cdn.myanimelist.net/images/anime/1208/139312l.jpg',
        videoUrl: '/videos/delicious-in-dungeon-trailer.mp4',
        year: 2024,
        rating: '8.4',
        episodes: 24,
        genres: ['adventure', 'comedy', 'fantasy'],
        isNewRelease: true,
        isTrending: true
    },
    {
        id: '32182',
        title: 'Mob Psycho 100',
        description: 'Eighth-grader Shigeo "Mob" Kageyama has tapped into his inner wellspring of psychic prowess at a young age. But the power quickly proves to be a liability when he realizes the potential danger of his skills. Through an encounter with another psychic, Mob resolves to use his own powers for the betterment of others.',
        shortDescription: 'A psychic middle schooler tries to live normally while keeping his powers in check.',
        thumbnail: 'https://cdn.myanimelist.net/images/anime/5/82890l.jpg',
        backgroundImage: 'https://cdn.myanimelist.net/images/anime/5/82890l.jpg',
        videoUrl: '/videos/mob-psycho-trailer.mp4',
        year: 2016,
        rating: '8.5',
        episodes: 12,
        genres: ['action', 'comedy', 'supernatural'],
        isNewRelease: false,
        isTrending: false
    },
    {
        id: '40028',
        title: 'Kimetsu no Yaiba',
        description: 'Since ancient times, rumors have abounded of man-eating demons lurking in the woods. Because of this, the local townsfolk never venture outside at night. Legend has it that a demon slayer also roams the night, hunting down these bloodthirsty demons. Ever since the death of his father, Tanjirou has taken it upon himself to support his mother and five siblings.',
        shortDescription: 'A young man becomes a demon slayer after his family is slaughtered and his sister is turned into a demon.',
        thumbnail: 'https://cdn.myanimelist.net/images/anime/1286/99889l.jpg',
        backgroundImage: 'https://cdn.myanimelist.net/images/anime/1286/99889l.jpg',
        videoUrl: '/videos/demon-slayer-trailer.mp4',
        year: 2019,
        rating: '8.5',
        episodes: 26,
        genres: ['action', 'supernatural', 'historical', 'shounen'],
        isNewRelease: false,
        isTrending: true
    },
    {
        id: '45613',
        title: 'Mushoku Tensei: Jobless Reincarnation',
        description: 'When a 34-year-old unemployed man is killed by a speeding truck, he finds himself reincarnated in a magical world as Rudeus Greyrat, a newborn baby. With knowledge, experience, and regrets from his previous life retained, Rudeus vows to lead a fulfilling life in this new world, departing from his past mistakes.',
        shortDescription: 'A middle-aged man is reincarnated in a fantasy world and resolves to make the most of his second chance.',
        thumbnail: 'https://cdn.myanimelist.net/images/anime/1530/117776l.jpg',
        backgroundImage: 'https://cdn.myanimelist.net/images/anime/1530/117776l.jpg',
        videoUrl: '/videos/mushoku-tensei-trailer.mp4',
        year: 2021,
        rating: '8.4',
        episodes: 11,
        genres: ['drama', 'fantasy', 'ecchi'],
        isNewRelease: false,
        isTrending: false
    },
    {
        id: '226',
        title: 'Elfen Lied',
        description: 'Lucy is a special breed of human referred to as "Diclonius," born with a short pair of horns and invisible telekinetic hands that lands her as a victim of inhumane scientific experimentation by the government. However, once circumstances present her an opportunity to escape, Lucy, corrupted by the confinement and torture, unleashes a torrent of bloodshed as she escapes her captors.',
        shortDescription: 'A dangerous mutant escapes from a government facility and develops a dual personality after injury.',
        thumbnail: 'https://cdn.myanimelist.net/images/anime/1995/121599l.jpg',
        backgroundImage: 'https://cdn.myanimelist.net/images/anime/1995/121599l.jpg',
        videoUrl: '/videos/elfen-lied-trailer.mp4',
        year: 2004,
        rating: '7.5',
        episodes: 13,
        genres: ['action', 'drama', 'horror', 'psychological', 'romance', 'supernatural'],
        isNewRelease: false,
        isTrending: false
    }
]; 