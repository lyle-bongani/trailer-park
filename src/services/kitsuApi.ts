// Kitsu API service
import axios, { AxiosInstance } from 'axios';
import { AnimeTrailer, Genre, PaginatedResponse, SortOption } from './api';

// Kitsu API credentials and endpoint
const KITSU_API_URL = 'https://kitsu.io/api/edge';
const KITSU_CLIENT_ID = process.env.REACT_APP_KITSU_CLIENT_ID || 'dd031b32d2f56c990b1425efe6c42ad847e7fe3ab46bf1299f05ecd856bdb7dd';
const KITSU_CLIENT_SECRET = process.env.REACT_APP_KITSU_CLIENT_SECRET || '54d7307928f63414defd96399fc31ba847961ceaecef3a5fd93144e960c0e151';
const IMAGE_PLACEHOLDER = 'https://via.placeholder.com/225x319?text=No+Image';

// Log Kitsu API configuration
console.log('======================= KITSU API DEBUG INFO =======================');
console.log('Kitsu Client ID:', KITSU_CLIENT_ID ? 'CONFIGURED ✓' : 'NOT CONFIGURED ✗');
console.log('Kitsu Client Secret:', KITSU_CLIENT_SECRET ? 'CONFIGURED ✓' : 'NOT CONFIGURED ✗');
console.log('================================================================');

// Create an Axios instance for Kitsu
const kitsuClient: AxiosInstance = axios.create({
    baseURL: KITSU_API_URL,
    headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json'
    }
});

// Add request interceptor for debugging
kitsuClient.interceptors.request.use(
    config => {
        console.log('Making Kitsu API request to:', config.url);
        return config;
    },
    error => {
        console.error('Kitsu request error:', error);
        return Promise.reject(error);
    }
);

// Add response interceptor for error handling
kitsuClient.interceptors.response.use(
    response => {
        console.log('Kitsu API response successful');
        return response;
    },
    error => {
        console.error('Kitsu API request failed:', error.response?.status || error.message);
        return Promise.reject(error);
    }
);

// Helper function to get OAuth token
let authToken: string | null = null;
let tokenExpiry: number | null = null;

export const getAuthToken = async (): Promise<string> => {
    // Check if we have a valid token
    if (authToken && tokenExpiry && Date.now() < tokenExpiry) {
        return authToken;
    }

    try {
        const response = await axios.post('https://kitsu.io/api/oauth/token', {
            grant_type: 'client_credentials',
            client_id: KITSU_CLIENT_ID,
            client_secret: KITSU_CLIENT_SECRET
        }, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (!response.data.access_token) {
            throw new Error('No access token returned from Kitsu OAuth endpoint');
        }

        // Explicitly assign as string to ensure type safety
        const token: string = response.data.access_token;
        authToken = token;

        // Set expiry time (typically 1 hour) minus a small buffer
        tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;
        return token;
    } catch (error) {
        console.error('Failed to get Kitsu auth token:', error);
        // Since this function promises to return a string, we need to return something
        // in case of error or throw an error that should be caught by the caller
        throw new Error('Failed to obtain Kitsu authentication token');
    }
};

// Add authentication to requests when needed
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const makeAuthenticatedRequest = async (endpoint: string, params: any = {}): Promise<any> => {
    try {
        const token = await getAuthToken();
        const response = await kitsuClient.get(endpoint, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            params
        });
        return response.data;
    } catch (error) {
        console.error(`Failed to make authenticated request to ${endpoint}:`, error);
        throw error;
    }
};

// Convert Kitsu anime object to AnimeTrailer format
const convertKitsuAnimeToAnimeTrailer = (anime: any): AnimeTrailer => {
    const currentYear = new Date().getFullYear();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // Attributes contain all the anime data
    const attr = anime.attributes;

    // Get poster image
    const posterImage = attr.posterImage?.large ||
        attr.posterImage?.medium ||
        attr.posterImage?.small ||
        IMAGE_PLACEHOLDER;

    // Get cover/background image
    const coverImage = attr.coverImage?.large ||
        attr.coverImage?.small ||
        posterImage;

    // Parse start date to check if it's a new release
    const startDate = attr.startDate ? new Date(attr.startDate) : null;
    const isNewRelease = startDate ? startDate >= threeMonthsAgo : false;

    // Determine if it's trending based on popularity
    const isTrending = attr.popularityRank && attr.popularityRank <= 200;

    return {
        id: anime.id.toString(),
        title: attr.titles?.en || attr.titles?.en_jp || attr.canonicalTitle || 'Unknown Title',
        description: attr.synopsis || attr.description || 'No description available.',
        shortDescription: attr.synopsis
            ? (attr.synopsis.length > 100 ? attr.synopsis.substring(0, 100) + '...' : attr.synopsis)
            : 'No description available.',
        thumbnail: posterImage,
        backgroundImage: coverImage,
        videoUrl: attr.youtubeVideoId ? `https://www.youtube.com/watch?v=${attr.youtubeVideoId}` : undefined,
        year: attr.startDate ? new Date(attr.startDate).getFullYear() : currentYear,
        rating: attr.averageRating ? (parseFloat(attr.averageRating) / 10).toFixed(1) : 'N/A',
        episodes: attr.episodeCount || 0,
        genres: [], // Will be populated separately if needed
        isNewRelease,
        isTrending
    };
};

// Fetch anime genres from Kitsu - they require a separate request
const fetchGenresForAnime = async (animeId: string): Promise<string[]> => {
    try {
        const response = await kitsuClient.get(`/anime/${animeId}/genres`);
        return response.data.data.map((genre: any) => genre.attributes.name.toLowerCase());
    } catch (error) {
        console.error(`Failed to fetch genres for anime ${animeId}:`, error);
        return [];
    }
};

// Fetch anime details by ID
export const fetchAnimeDetailsFromKitsu = async (id: string): Promise<AnimeTrailer | null> => {
    try {
        console.log(`Attempting to fetch anime details from Kitsu for ID: ${id}`);
        const response = await kitsuClient.get(`/anime/${id}`, {
            params: {
                include: 'genres'
            }
        });

        if (response.data?.data) {
            const animeData = response.data.data;
            const animeTrailer = convertKitsuAnimeToAnimeTrailer(animeData);

            // Try to get genres from included data
            if (response.data.included) {
                const genres = response.data.included
                    .filter((item: any) => item.type === 'genres')
                    .map((genre: any) => genre.attributes.name.toLowerCase());
                animeTrailer.genres = genres;
            } else {
                // Fetch genres separately if not included
                animeTrailer.genres = await fetchGenresForAnime(id);
            }

            return animeTrailer;
        }
        return null;
    } catch (error) {
        console.error(`Failed to fetch anime details from Kitsu for ID ${id}:`, error);
        return null;
    }
};

// Search for anime
export const searchAnimeFromKitsu = async (query: string, limit = 20): Promise<AnimeTrailer[]> => {
    try {
        console.log(`Searching for anime on Kitsu: ${query}`);
        const response = await kitsuClient.get('/anime', {
            params: {
                'filter[text]': query,
                'page[limit]': limit,
                'include': 'genres'
            }
        });

        if (response.data?.data) {
            const animeList = await Promise.all(
                response.data.data.map(async (anime: any) => {
                    const animeTrailer = convertKitsuAnimeToAnimeTrailer(anime);

                    // Try to find genres in included data
                    if (response.data.included) {
                        const relationships = anime.relationships?.genres?.data || [];
                        const genreIds = relationships.map((rel: any) => rel.id);

                        const genres = response.data.included
                            .filter((item: any) => item.type === 'genres' && genreIds.includes(item.id))
                            .map((genre: any) => genre.attributes.name.toLowerCase());

                        animeTrailer.genres = genres;
                    }

                    return animeTrailer;
                })
            );

            return animeList;
        }
        return [];
    } catch (error) {
        console.error('Failed to search anime on Kitsu:', error);
        return [];
    }
};

// Fetch trending anime
export const fetchTrendingAnimeFromKitsu = async (limit = 20): Promise<AnimeTrailer[]> => {
    try {
        console.log('Fetching trending anime from Kitsu');
        const response = await kitsuClient.get('/trending/anime', {
            params: {
                'page[limit]': limit
            }
        });

        if (response.data?.data) {
            const animeList = await Promise.all(
                response.data.data.map(async (anime: any) => {
                    const animeTrailer = convertKitsuAnimeToAnimeTrailer(anime);
                    // Mark as trending since it's from the trending endpoint
                    animeTrailer.isTrending = true;

                    // Fetch genres separately
                    try {
                        animeTrailer.genres = await fetchGenresForAnime(anime.id);
                    } catch (error) {
                        console.error(`Failed to fetch genres for anime ${anime.id}:`, error);
                    }

                    return animeTrailer;
                })
            );

            return animeList;
        }
        return [];
    } catch (error) {
        console.error('Failed to fetch trending anime from Kitsu:', error);
        return [];
    }
};

// Fetch new releases (currently airing anime)
export const fetchNewReleasesFromKitsu = async (limit = 20): Promise<AnimeTrailer[]> => {
    try {
        console.log('Fetching new releases from Kitsu');
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const currentSeason = getCurrentSeason();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const currentYear = new Date().getFullYear();

        const response = await kitsuClient.get('/anime', {
            params: {
                'filter[status]': 'current',
                'sort': '-startDate',
                'page[limit]': limit
            }
        });

        if (response.data?.data) {
            const animeList = await Promise.all(
                response.data.data.map(async (anime: any) => {
                    const animeTrailer = convertKitsuAnimeToAnimeTrailer(anime);
                    // Mark as new release
                    animeTrailer.isNewRelease = true;

                    // Fetch genres separately
                    try {
                        animeTrailer.genres = await fetchGenresForAnime(anime.id);
                    } catch (error) {
                        console.error(`Failed to fetch genres for anime ${anime.id}:`, error);
                    }

                    return animeTrailer;
                })
            );

            return animeList;
        }
        return [];
    } catch (error) {
        console.error('Failed to fetch new releases from Kitsu:', error);
        return [];
    }
};

// Helper function to get current season
const getCurrentSeason = (): string => {
    const month = new Date().getMonth();
    if (month >= 0 && month <= 2) return 'winter';
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    return 'fall';
};

// Fetch all anime with pagination and filters
export const fetchAllAnimeFromKitsu = async (
    page = 1,
    limit = 24,
    sort: SortOption = 'anime_score',
    sortDirection: 'desc' | 'asc' = 'desc',
    genre?: number
): Promise<PaginatedResponse<AnimeTrailer>> => {
    try {
        console.log('Fetching all anime from Kitsu');

        // Map MyAnimeList sort options to Kitsu sort options
        const sortMapping: Record<SortOption, string> = {
            'anime_score': 'averageRating',
            'anime_num_list_users': 'userCount',
            'start_date': 'startDate',
            'title': 'titles.en',
            'rank': 'popularityRank'
        };

        const sortValue = `${sortDirection === 'desc' ? '-' : ''}${sortMapping[sort]}`;

        // Prepare parameters
        const params: any = {
            'sort': sortValue,
            'page[limit]': limit,
            'page[offset]': (page - 1) * limit,
            'include': 'genres'
        };

        // Add genre filter if provided
        if (genre) {
            // In Kitsu, we need to fetch the genre name first based on the genre ID
            // This is just a workaround - in a real implementation, you would have a proper mapping
            // Between MAL genre IDs and Kitsu genre slugs
            const genreNames = ['Action', 'Adventure', 'Comedy', 'Drama', 'Slice of Life',
                'Fantasy', 'Magic', 'Supernatural', 'Horror', 'Mystery'];

            if (genre > 0 && genre <= genreNames.length) {
                params['filter[genres]'] = genreNames[genre - 1];
            }
        }

        const response = await kitsuClient.get('/anime', { params });

        if (response.data?.data) {
            const animeList = await Promise.all(
                response.data.data.map(async (anime: any) => {
                    const animeTrailer = convertKitsuAnimeToAnimeTrailer(anime);

                    // Try to find genres in included data
                    if (response.data.included) {
                        const relationships = anime.relationships?.genres?.data || [];
                        const genreIds = relationships.map((rel: any) => rel.id);

                        const genres = response.data.included
                            .filter((item: any) => item.type === 'genres' && genreIds.includes(item.id))
                            .map((genre: any) => genre.attributes.name.toLowerCase());

                        animeTrailer.genres = genres;
                    }

                    return animeTrailer;
                })
            );

            // Extract pagination information
            const links = response.data.links || {};
            const total = response.data.meta?.count || 0;
            const lastPage = Math.ceil(total / limit);

            return {
                data: animeList,
                paging: {
                    next: links.next || undefined,
                    previous: links.prev || undefined
                },
                total,
                currentPage: page,
                lastPage
            };
        }

        return {
            data: [],
            paging: {},
            currentPage: page,
            lastPage: page
        };
    } catch (error) {
        console.error('Failed to fetch all anime from Kitsu:', error);
        return {
            data: [],
            paging: {},
            currentPage: page,
            lastPage: page
        };
    }
};

// Fetch genres from Kitsu
export const fetchGenresFromKitsu = async (): Promise<Genre[]> => {
    try {
        console.log('Fetching genres from Kitsu');
        const response = await kitsuClient.get('/genres');

        if (response.data?.data) {
            return response.data.data.map((genre: any, index: number) => ({
                id: index + 1, // Using index as ID to match our existing genre ID system
                name: genre.attributes.name
            }));
        }
        return [];
    } catch (error) {
        console.error('Failed to fetch genres from Kitsu:', error);
        return [];
    }
};

// Export Kitsu API functions
export const kitsuApi = {
    fetchAnimeDetails: fetchAnimeDetailsFromKitsu,
    searchAnime: searchAnimeFromKitsu,
    fetchTrendingAnime: fetchTrendingAnimeFromKitsu,
    fetchNewReleases: fetchNewReleasesFromKitsu,
    fetchAllAnime: fetchAllAnimeFromKitsu,
    fetchGenres: fetchGenresFromKitsu,
    getAuthToken
};

export default kitsuApi; 