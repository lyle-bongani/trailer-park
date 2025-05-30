// MyAnimeList API service
// You'll need to register for a MyAnimeList API client ID: https://myanimelist.net/apiconfig
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import anilistApi from './anilistApi';
import kitsuApi from './kitsuApi';

// Use the provided client ID and secret
const MAL_CLIENT_ID = process.env.REACT_APP_MAL_CLIENT_ID || 'f964474b9d17e82a1f0229c781f28afc'; // Use environment variable or fallback to hardcoded value
const MAL_CLIENT_SECRET = process.env.REACT_APP_MAL_CLIENT_SECRET || '6f0064e892f4beea188d3b1a6d9a12ee2051920abbfb8630d922f4c4de86c864'; // Client secret if needed

// CORS Proxy configuration - will be used as a fallback if direct API requests fail
const CORS_PROXY_URLS = [
    'https://cors-anywhere.herokuapp.com/',
    'https://cors-proxy.htmldriven.com/?url=',
    'https://api.allorigins.win/raw?url='
];
let currentProxyIndex = -1; // Start with no proxy

// Function to get the next available proxy URL
const getNextProxy = () => {
    currentProxyIndex = (currentProxyIndex + 1) % CORS_PROXY_URLS.length;
    return CORS_PROXY_URLS[currentProxyIndex];
};

// Add more comprehensive logging
console.log('======================= API DEBUG INFO =======================');
console.log('API Client ID:', process.env.REACT_APP_MAL_CLIENT_ID ? 'CONFIGURED ✓' : 'NOT CONFIGURED ✗');
console.log('Using Client ID:', MAL_CLIENT_ID);
console.log('MAL Client Secret is', MAL_CLIENT_SECRET ? 'configured' : 'not configured');
console.log('================================================================');

// Force the use of real API data instead of mock data
const IS_USING_MOCK = false; // Setting to false to always use real API data

export const isMockDataEnabled = () => IS_USING_MOCK;

if (IS_USING_MOCK) {
    console.warn('------------------------------------------------------------');
    console.warn('| MyAnimeList API Client ID not configured in .env file    |');
    console.warn('| Using mock data instead of real API calls                |');
    console.warn('| Get your client ID at: https://myanimelist.net/apiconfig |');
    console.warn('------------------------------------------------------------');
} else {
    console.log('Using real data from MyAnimeList API with AniList and Kitsu APIs as backup');
}

const MAL_BASE_URL = 'https://api.myanimelist.net/v2';
const MAL_AUTH_URL = 'https://myanimelist.net/v1/oauth2';
const IMAGE_PLACEHOLDER = 'https://via.placeholder.com/225x319?text=No+Image';

// OAuth token storage for authenticated requests
let malAuthToken: string | null = null;
let malTokenExpiry: number | null = null;

// Helper function to get MyAnimeList OAuth token when needed
export const getMALAuthToken = async (): Promise<string | null> => {
    // Check if we have a valid token already
    if (malAuthToken && malTokenExpiry && Date.now() < malTokenExpiry) {
        return malAuthToken;
    }

    // Only attempt to get a token if we have both client ID and secret
    if (!MAL_CLIENT_ID || !MAL_CLIENT_SECRET) {
        console.warn('MyAnimeList client ID or secret missing, cannot perform authenticated requests');
        return null;
    }

    try {
        console.log('Attempting to obtain MyAnimeList OAuth token...');
        const response = await axios.post(`${MAL_AUTH_URL}/token`,
            new URLSearchParams({
                client_id: MAL_CLIENT_ID,
                client_secret: MAL_CLIENT_SECRET,
                grant_type: 'client_credentials'
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        if (response.data.access_token) {
            malAuthToken = response.data.access_token;
            // Set token expiry (typically 1 hour) minus a small buffer
            malTokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;
            console.log('Successfully obtained MyAnimeList OAuth token');
            return malAuthToken;
        } else {
            console.error('MyAnimeList OAuth response did not contain an access token');
            return null;
        }
    } catch (error) {
        console.error('Failed to obtain MyAnimeList OAuth token:', error);
        return null;
    }
};

// Create an Axios instance with default config
const malApi: AxiosInstance = axios.create({
    baseURL: MAL_BASE_URL,
    headers: {
        'X-MAL-CLIENT-ID': MAL_CLIENT_ID,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    },
    timeout: 10000, // 10 seconds timeout
    // Important: Ensure credentials are not included unless specifically needed
    withCredentials: false
});

// Add request interceptor for debugging and adding auth tokens when available
malApi.interceptors.request.use(
    async config => {
        console.log('Making API request to:', config.url);

        // Try to add OAuth token for authorized requests if needed
        if (config.url && (
            config.url.includes('/animelist') ||
            config.url.includes('/user') ||
            config.url.includes('/forum')
        )) {
            try {
                const token = await getMALAuthToken();
                if (token) {
                    config.headers = config.headers || {};
                    config.headers['Authorization'] = `Bearer ${token}`;
                    console.log('Added OAuth token to request');
                }
            } catch (error) {
                console.error('Failed to add OAuth token to request:', error);
                // Continue with the request anyway using client ID
            }
        }

        console.log('With headers:', JSON.stringify(config.headers));
        return config;
    },
    error => {
        console.error('Request error:', error);
        return Promise.reject(error);
    }
);

// Add response interceptor for error handling with improved logging
malApi.interceptors.response.use(
    response => {
        console.log('API response successful for:', response.config.url);
        return response;
    },
    error => {
        console.error('API request failed:', error.response?.status || error.message);
        console.error('Request URL:', error.config?.url);
        console.error('Request method:', error.config?.method);

        if (error.response) {
            console.error('Response data:', error.response?.data);
            console.error('Response headers:', error.response?.headers);
        }

        // Enhance error message with more context
        if (error.response?.status === 401 || error.response?.status === 403) {
            console.warn('Authentication error - check your MAL API Client ID');
            error.message = `Authentication error (${error.response.status}): ${error.message}`;
        } else if (error.response?.status === 429) {
            console.warn('Rate limiting error - too many requests');
            error.message = `Rate limit exceeded (429): ${error.message}`;
        } else if (error.response?.status >= 500) {
            console.warn('Server error - API service may be experiencing issues');
            error.message = `Server error (${error.response.status}): ${error.message}`;
        } else if (!error.response && error.message === 'Network Error') {
            console.warn('Network error - this might be a CORS issue');
            error.message = 'Network error: Possible CORS issue or server is unreachable';
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
interface MALParams {
    [key: string]: any;
    limit?: number;
    offset?: number;
    sort?: string;
    genre?: number;
    ranking_type?: string;
    fields?: string;
    q?: string;
}

const fetchFromMAL = async (endpoint: string, params: MALParams = {}) => {
    try {
        console.log(`Attempting to fetch data from MyAnimeList API - ${endpoint} with params:`, params);

        // Create a more robust configuration with longer timeout
        const config: AxiosRequestConfig = {
            params,
            timeout: 10000, // 10 seconds timeout
            headers: {
                'X-MAL-CLIENT-ID': MAL_CLIENT_ID,
                'Accept': 'application/json'
            }
        };

        // Try the request
        const response = await malApi.get(endpoint, config);
        console.log(`Successfully fetched data from MyAnimeList API - ${endpoint}`);
        return response.data;
    } catch (error: any) {
        console.error(`Failed to fetch data from MyAnimeList API - ${endpoint}:`, error.message);

        // Provide more detailed error information to help with debugging
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error('Error response status:', error.response.status);
            console.error('Error response headers:', error.response.headers);
            console.error('Error response data:', error.response.data);
        } else if (error.request) {
            // The request was made but no response was received
            console.error('No response received from server. This might be a network or CORS issue.');
            console.error('Request details:', error.request);
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Error in request setup:', error.message);
        }
        console.error('Error config:', error.config);

        // Check if this might be a CORS issue
        const isCorsIssue = error.message && (
            error.message.includes('CORS') ||
            error.message.includes('Network Error') ||
            (error.response && error.response.status === 0)
        );

        // If it seems like a CORS issue, try using a proxy
        if (isCorsIssue) {
            try {
                console.log('Possible CORS issue detected. Attempting to use a CORS proxy...');
                const proxyUrl = getNextProxy();
                const targetUrl = `${MAL_BASE_URL}${endpoint}`;

                // Construct query parameters
                const queryParams = new URLSearchParams();
                for (const key in params) {
                    queryParams.append(key, params[key]);
                }

                const fullUrl = `${proxyUrl}${encodeURIComponent(targetUrl + (queryParams.toString() ? `?${queryParams.toString()}` : ''))}`;
                console.log(`Using proxy URL: ${fullUrl}`);

                const proxyResponse = await axios.get(fullUrl, {
                    headers: {
                        'X-MAL-CLIENT-ID': MAL_CLIENT_ID,
                        'Origin': window.location.origin
                    },
                    timeout: 15000 // Longer timeout for proxy requests
                });

                console.log('Successfully fetched data through proxy');
                return proxyResponse.data;
            } catch (proxyError: any) {
                console.error('Failed to fetch data through proxy:', proxyError.message);
                // Continue to fallback APIs
            }
        }

        // Try with AniList API as a fallback for common endpoints
        if (endpoint.startsWith('/anime/') && endpoint.split('/').length === 3) {
            // This is a anime details endpoint - try AniList
            try {
                const animeId = endpoint.split('/')[2];
                console.log(`Attempting to fetch anime details from AniList API for ID: ${animeId}`);
                const anilistResult = await anilistApi.fetchAnimeDetails(animeId);
                if (anilistResult) {
                    console.log(`Successfully fetched anime details from AniList API for ID: ${animeId}`);
                    // Convert to MAL format expected by the rest of the app
                    return {
                        id: anilistResult.id,
                        title: anilistResult.title,
                        main_picture: {
                            large: anilistResult.thumbnail,
                            medium: anilistResult.thumbnail
                        },
                        pictures: [{ large: anilistResult.backgroundImage, medium: anilistResult.backgroundImage }],
                        synopsis: anilistResult.description,
                        mean: parseFloat(anilistResult.rating) || null,
                        popularity: 100, // Arbitrary value
                        num_episodes: anilistResult.episodes,
                        start_date: null,
                        genres: anilistResult.genres.map(g => ({ name: g }))
                    };
                }
            } catch (anilistError) {
                console.error(`Failed fallback to AniList API for anime details:`, anilistError);

                // If AniList fails, try Kitsu as a second fallback
                try {
                    const animeId = endpoint.split('/')[2];
                    console.log(`Attempting to fetch anime details from Kitsu API for ID: ${animeId}`);
                    const kitsuResult = await kitsuApi.fetchAnimeDetails(animeId);
                    if (kitsuResult) {
                        console.log(`Successfully fetched anime details from Kitsu API for ID: ${animeId}`);
                        // Convert to MAL format expected by the rest of the app
                        return {
                            id: kitsuResult.id,
                            title: kitsuResult.title,
                            main_picture: {
                                large: kitsuResult.thumbnail,
                                medium: kitsuResult.thumbnail
                            },
                            pictures: [{ large: kitsuResult.backgroundImage, medium: kitsuResult.backgroundImage }],
                            synopsis: kitsuResult.description,
                            mean: parseFloat(kitsuResult.rating) || null,
                            popularity: 100, // Arbitrary value
                            num_episodes: kitsuResult.episodes,
                            start_date: null,
                            genres: kitsuResult.genres.map(g => ({ name: g }))
                        };
                    }
                } catch (kitsuError) {
                    console.error(`Failed fallback to Kitsu API for anime details:`, kitsuError);
                }
            }
        } else if (endpoint === '/anime') {
            // This is a search or browse endpoint - try AniList
            try {
                console.log(`Attempting to fetch anime list from AniList API`);
                const page = params.offset ? Math.floor(params.offset / (params.limit ?? 24)) + 1 : 1;
                const sort = params.sort || 'anime_score';
                const sortDirection = sort.endsWith('_asc') ? 'asc' : 'desc';
                const baseSort = sort.replace('_asc', '');
                const genre = params.genre;

                const anilistResult = await anilistApi.fetchAllAnime(
                    page,
                    params.limit || 24,
                    baseSort as SortOption,
                    sortDirection as 'asc' | 'desc',
                    genre
                );

                if (anilistResult && anilistResult.data && anilistResult.data.length > 0) {
                    console.log(`Successfully fetched anime list from AniList API`);
                    // Convert to MAL format expected by the rest of the app
                    return {
                        data: anilistResult.data.map(anime => ({
                            node: {
                                id: anime.id,
                                title: anime.title,
                                main_picture: {
                                    large: anime.thumbnail,
                                    medium: anime.thumbnail
                                },
                                synopsis: anime.description,
                                mean: parseFloat(anime.rating) || null,
                                popularity: 100, // Arbitrary value
                                num_episodes: anime.episodes,
                                start_date: null,
                                genres: anime.genres.map(g => ({ name: g }))
                            }
                        })),
                        paging: anilistResult.paging
                    };
                }
            } catch (anilistError) {
                console.error(`Failed fallback to AniList API for anime list:`, anilistError);

                // If AniList fails, try Kitsu as a second fallback
                try {
                    console.log(`Attempting to fetch anime list from Kitsu API`);
                    const page = params.offset ? Math.floor(params.offset / (params.limit ?? 24)) + 1 : 1;
                    const sort = params.sort || 'anime_score';
                    const sortDirection = sort.endsWith('_asc') ? 'asc' : 'desc';
                    const baseSort = sort.replace('_asc', '');
                    const genre = params.genre;

                    const kitsuResult = await kitsuApi.fetchAllAnime(
                        page,
                        params.limit || 24,
                        baseSort as SortOption,
                        sortDirection as 'asc' | 'desc',
                        genre
                    );

                    if (kitsuResult && kitsuResult.data && kitsuResult.data.length > 0) {
                        console.log(`Successfully fetched anime list from Kitsu API`);
                        // Convert to MAL format expected by the rest of the app
                        return {
                            data: kitsuResult.data.map(anime => ({
                                node: {
                                    id: anime.id,
                                    title: anime.title,
                                    main_picture: {
                                        large: anime.thumbnail,
                                        medium: anime.thumbnail
                                    },
                                    synopsis: anime.description,
                                    mean: parseFloat(anime.rating) || null,
                                    popularity: 100, // Arbitrary value
                                    num_episodes: anime.episodes,
                                    start_date: null,
                                    genres: anime.genres.map(g => ({ name: g }))
                                }
                            })),
                            paging: kitsuResult.paging
                        };
                    }
                } catch (kitsuError) {
                    console.error(`Failed fallback to Kitsu API for anime list:`, kitsuError);
                }
            }
        } else if (endpoint === '/anime/ranking') {
            // This is a ranking/trending endpoint - try AniList
            try {
                const rankingType = params.ranking_type || 'all';
                console.log(`Attempting to fetch ${rankingType} anime from AniList API`);

                let anilistResult;
                if (rankingType === 'bypopularity' || rankingType === 'all') {
                    anilistResult = await anilistApi.fetchTrendingAnime(params.limit || 20);
                } else if (rankingType === 'airing') {
                    anilistResult = await anilistApi.fetchNewReleases(params.limit || 20);
                }

                if (anilistResult && anilistResult.length > 0) {
                    console.log(`Successfully fetched ${rankingType} anime from AniList API`);
                    // Convert to MAL format expected by the rest of the app
                    return {
                        data: anilistResult.map(anime => ({
                            node: {
                                id: anime.id,
                                title: anime.title,
                                main_picture: {
                                    large: anime.thumbnail,
                                    medium: anime.thumbnail
                                },
                                synopsis: anime.description,
                                mean: parseFloat(anime.rating) || null,
                                popularity: 100, // Arbitrary value
                                num_episodes: anime.episodes,
                                start_date: null,
                                genres: anime.genres.map(g => ({ name: g }))
                            }
                        }))
                    };
                }
            } catch (anilistError) {
                console.error(`Failed fallback to AniList API for ranking:`, anilistError);

                // If AniList fails, try Kitsu as a second fallback
                try {
                    const rankingType = params.ranking_type || 'all';
                    console.log(`Attempting to fetch ${rankingType} anime from Kitsu API`);

                    let kitsuResult;
                    if (rankingType === 'bypopularity' || rankingType === 'all') {
                        kitsuResult = await kitsuApi.fetchTrendingAnime(params.limit || 20);
                    } else if (rankingType === 'airing') {
                        kitsuResult = await kitsuApi.fetchNewReleases(params.limit || 20);
                    }

                    if (kitsuResult && kitsuResult.length > 0) {
                        console.log(`Successfully fetched ${rankingType} anime from Kitsu API`);
                        // Convert to MAL format expected by the rest of the app
                        return {
                            data: kitsuResult.map(anime => ({
                                node: {
                                    id: anime.id,
                                    title: anime.title,
                                    main_picture: {
                                        large: anime.thumbnail,
                                        medium: anime.thumbnail
                                    },
                                    synopsis: anime.description,
                                    mean: parseFloat(anime.rating) || null,
                                    popularity: 100, // Arbitrary value
                                    num_episodes: anime.episodes,
                                    start_date: null,
                                    genres: anime.genres.map(g => ({ name: g }))
                                }
                            }))
                        };
                    }
                } catch (kitsuError) {
                    console.error(`Failed fallback to Kitsu API for ranking:`, kitsuError);
                }
            }
        }

        // If we couldn't use AniList API as a fallback, try a direct test request to see if MAL API is available at all
        try {
            console.log('Attempting a basic test API request to MyAnimeList...');
            const testResponse = await fetch('https://api.myanimelist.net/v2/anime?q=test', {
                headers: {
                    'X-MAL-CLIENT-ID': MAL_CLIENT_ID
                }
            });

            if (testResponse.ok) {
                console.log('Basic MyAnimeList API test request succeeded, problem may be with specific endpoint or params');
            } else {
                console.error('Basic MyAnimeList API test request also failed with status:', testResponse.status);
                console.error('MyAnimeList API might be down or client ID is invalid');
            }
        } catch (testError) {
            console.error('Could not even perform basic MAL API test request:', testError);
        }

        throw error;
    }
};

// Function to fetch anime details
export const fetchAnimeDetails = async (id: string): Promise<AnimeTrailer | null> => {
    try {
        // Only check for mock ID if we're using mock mode
        if (IS_USING_MOCK && id.includes('_')) {
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

        // Only use mock data fallback if in mock mode
        if (IS_USING_MOCK && !id.includes('_')) {
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
        // Only use mock data if explicitly in mock mode
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
        if (IS_USING_MOCK) {
            console.log('Falling back to mock data');
            return mockTrailers.slice(0, limit);
        }
        return []; // Return empty array when API fails and not in mock mode
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

        // Make the API request with retry mechanism
        let data;
        let retryCount = 0;
        const maxRetries = 2;

        while (retryCount <= maxRetries) {
            try {
                // Make the API request
                data = await fetchFromMAL('/anime', params);
                break; // If successful, exit the loop
            } catch (error) {
                retryCount++;
                console.log(`Retry ${retryCount}/${maxRetries} for fetchAllAnime`);

                if (retryCount > maxRetries) {
                    // We've reached max retries, try fallback APIs
                    console.log('Max retries reached, attempting fallback APIs...');
                    throw error; // This will trigger the fallback APIs in the catch block
                }

                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
        }

        // If we got here with data, process it
        if (data) {
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
        }

        // This should not be reached if data is defined
        throw new Error('No data returned from API');

    } catch (error) {
        console.error('Failed to fetch all anime:', error);
        console.log('Attempting to use fallback APIs...');

        // Try AniList API fallback
        try {
            console.log('Trying AniList API for fetchAllAnime...');
            const anilistResult = await anilistApi.fetchAllAnime(
                page,
                limit,
                sort,
                sortDirection,
                genre
            );

            if (anilistResult && anilistResult.data && anilistResult.data.length > 0) {
                console.log('Successfully fetched anime from AniList fallback');
                return anilistResult;
            }
        } catch (anilistError) {
            console.error('AniList fallback failed:', anilistError);
        }

        // Try Kitsu API as a final fallback
        try {
            console.log('Trying Kitsu API for fetchAllAnime...');
            const kitsuResult = await kitsuApi.fetchAllAnime(
                page,
                limit,
                sort,
                sortDirection,
                genre
            );

            if (kitsuResult && kitsuResult.data && kitsuResult.data.length > 0) {
                console.log('Successfully fetched anime from Kitsu fallback');
                return kitsuResult;
            }
        } catch (kitsuError) {
            console.error('Kitsu fallback failed:', kitsuError);
        }

        // If all APIs fail, return mock data as a last resort
        console.log('All API attempts failed. Falling back to mock data');
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
        if (IS_USING_MOCK) {
            return mockTrailers.filter(t => t.isTrending).slice(0, limit);
        }
        return []; // Return empty array if not in mock mode
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
        if (IS_USING_MOCK) {
            return mockTrailers.filter(t => t.isNewRelease).slice(0, limit);
        }
        return []; // Return empty array if not in mock mode
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

        // Only fall back to mock data if in mock mode
        if (IS_USING_MOCK) {
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

        return []; // Return empty array when API fails and not in mock mode
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
                // Try to get real data from MyAnimeList first
                if (!IS_USING_MOCK) {
                    try {
                        console.log('Attempting to fetch featured trailer from MyAnimeList API...');
                        const trending = await fetchTrendingAnime(1);
                        if (trending && trending.length > 0) {
                            console.log('Successfully fetched featured trailer from MyAnimeList API');
                            return trending[0];
                        }
                    } catch (error) {
                        console.error('Failed to fetch featured trailer from MyAnimeList API:', error);
                    }

                    // If MyAnimeList fails, try AniList
                    try {
                        console.log('Attempting to fetch featured trailer from AniList API...');
                        const anilistTrending = await anilistApi.fetchTrendingAnime(1);
                        if (anilistTrending && anilistTrending.length > 0) {
                            console.log('Successfully fetched featured trailer from AniList API');
                            return anilistTrending[0];
                        }
                    } catch (anilistError) {
                        console.error('Failed to fetch featured trailer from AniList API:', anilistError);
                    }

                    // If AniList fails, try Kitsu
                    try {
                        console.log('Attempting to fetch featured trailer from Kitsu API...');
                        const kitsuTrending = await kitsuApi.fetchTrendingAnime(1);
                        if (kitsuTrending && kitsuTrending.length > 0) {
                            console.log('Successfully fetched featured trailer from Kitsu API');
                            return kitsuTrending[0];
                        }
                    } catch (kitsuError) {
                        console.error('Failed to fetch featured trailer from Kitsu API:', kitsuError);
                    }
                }

                // Fall back to mock data if both APIs failed or we're in mock mode
                console.log('Using mock data for featured trailer');
                return mockTrailers[0];
            } catch (error) {
                console.error('All attempts to fetch featured trailer failed, using placeholder:', error);
                // Create a simple placeholder as last resort
                return {
                    id: '0',
                    title: 'Loading Error',
                    description: 'Could not fetch anime data. Please try again later.',
                    shortDescription: 'Could not fetch anime data.',
                    thumbnail: IMAGE_PLACEHOLDER,
                    backgroundImage: IMAGE_PLACEHOLDER,
                    year: new Date().getFullYear(),
                    rating: 'N/A',
                    episodes: 0,
                    genres: ['anime'],
                    isNewRelease: false,
                    isTrending: false
                };
            }
        },
        fetchTrendingTrailers: async (): Promise<AnimeTrailer[]> => {
            try {
                // Try MyAnimeList API first
                if (!IS_USING_MOCK) {
                    try {
                        console.log('Attempting to fetch trending trailers from MyAnimeList API...');
                        const trending = await fetchTrendingAnime();
                        if (trending && trending.length > 0) {
                            console.log('Successfully fetched trending trailers from MyAnimeList API');
                            return trending;
                        }
                    } catch (error) {
                        console.error('Failed to fetch trending trailers from MyAnimeList API:', error);
                    }

                    // If MyAnimeList fails, try AniList
                    try {
                        console.log('Attempting to fetch trending trailers from AniList API...');
                        const anilistTrending = await anilistApi.fetchTrendingAnime();
                        if (anilistTrending && anilistTrending.length > 0) {
                            console.log('Successfully fetched trending trailers from AniList API');
                            return anilistTrending;
                        }
                    } catch (anilistError) {
                        console.error('Failed to fetch trending trailers from AniList API:', anilistError);
                    }

                    // If AniList fails, try Kitsu
                    try {
                        console.log('Attempting to fetch trending trailers from Kitsu API...');
                        const kitsuTrending = await kitsuApi.fetchTrendingAnime();
                        if (kitsuTrending && kitsuTrending.length > 0) {
                            console.log('Successfully fetched trending trailers from Kitsu API');
                            return kitsuTrending;
                        }
                    } catch (kitsuError) {
                        console.error('Failed to fetch trending trailers from Kitsu API:', kitsuError);
                    }
                }

                // Fall back to mock data
                console.log('Using mock data for trending trailers');
                return mockTrailers.filter(t => t.isTrending);
            } catch (error) {
                console.error('All attempts to fetch trending trailers failed:', error);
                return mockTrailers.filter(t => t.isTrending).slice(0, 5);
            }
        },
        fetchNewReleases: async (): Promise<AnimeTrailer[]> => {
            try {
                // Try MyAnimeList API first
                if (!IS_USING_MOCK) {
                    try {
                        console.log('Attempting to fetch new releases from MyAnimeList API...');
                        const newReleases = await fetchNewReleases();
                        if (newReleases && newReleases.length > 0) {
                            console.log('Successfully fetched new releases from MyAnimeList API');
                            return newReleases;
                        }
                    } catch (error) {
                        console.error('Failed to fetch new releases from MyAnimeList API:', error);
                    }

                    // If MyAnimeList fails, try AniList
                    try {
                        console.log('Attempting to fetch new releases from AniList API...');
                        const anilistNewReleases = await anilistApi.fetchNewReleases();
                        if (anilistNewReleases && anilistNewReleases.length > 0) {
                            console.log('Successfully fetched new releases from AniList API');
                            return anilistNewReleases;
                        }
                    } catch (anilistError) {
                        console.error('Failed to fetch new releases from AniList API:', anilistError);
                    }

                    // If AniList fails, try Kitsu
                    try {
                        console.log('Attempting to fetch new releases from Kitsu API...');
                        const kitsuNewReleases = await kitsuApi.fetchNewReleases();
                        if (kitsuNewReleases && kitsuNewReleases.length > 0) {
                            console.log('Successfully fetched new releases from Kitsu API');
                            return kitsuNewReleases;
                        }
                    } catch (kitsuError) {
                        console.error('Failed to fetch new releases from Kitsu API:', kitsuError);
                    }
                }

                // Fall back to mock data
                console.log('Using mock data for new releases');
                return mockTrailers.filter(t => t.isNewRelease);
            } catch (error) {
                console.error('All attempts to fetch new releases failed:', error);
                return mockTrailers.filter(t => t.isNewRelease).slice(0, 5);
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