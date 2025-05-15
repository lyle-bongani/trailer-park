// AniList GraphQL API service
import axios from 'axios';
import { AnimeTrailer, Genre, PaginatedResponse, SortOption } from './api';

// AniList API endpoint
const ANILIST_API_URL = 'https://graphql.anilist.co';
const IMAGE_PLACEHOLDER = 'https://via.placeholder.com/225x319?text=No+Image';

// Create an Axios instance for AniList
const anilistClient = axios.create({
    baseURL: ANILIST_API_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }
});

// Add request interceptor for debugging
anilistClient.interceptors.request.use(
    config => {
        console.log('Making AniList API request');
        return config;
    },
    error => {
        console.error('AniList request error:', error);
        return Promise.reject(error);
    }
);

// Add response interceptor for error handling
anilistClient.interceptors.response.use(
    response => {
        console.log('AniList API response successful');
        return response;
    },
    error => {
        console.error('AniList API request failed:', error.response?.status || error.message);
        return Promise.reject(error);
    }
);

// Helper function to make GraphQL requests to AniList
const queryAniList = async (query: string, variables: any = {}) => {
    try {
        const response = await anilistClient.post('', {
            query,
            variables
        });
        return response.data;
    } catch (error) {
        console.error('Failed to query AniList:', error);
        throw error;
    }
};

// Query to fetch anime by ID
const ANIME_BY_ID_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      title {
        romaji
        english
        native
      }
      description
      coverImage {
        large
        medium
      }
      bannerImage
      startDate {
        year
        month
        day
      }
      endDate {
        year
        month
        day
      }
      season
      seasonYear
      episodes
      duration
      format
      status
      genres
      averageScore
      popularity
      trending
      isAdult
      tags {
        id
        name
      }
    }
  }
`;

// Query to search for anime
const ANIME_SEARCH_QUERY = `
  query ($search: String, $page: Int, $perPage: Int, $sort: [MediaSort]) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        total
        currentPage
        lastPage
        hasNextPage
        perPage
      }
      media(search: $search, type: ANIME, sort: $sort) {
        id
        title {
          romaji
          english
          native
        }
        description
        coverImage {
          large
          medium
        }
        bannerImage
        startDate {
          year
          month
          day
        }
        episodes
        format
        genres
        averageScore
        popularity
        trending
      }
    }
  }
`;

// Query to fetch trending anime
const TRENDING_ANIME_QUERY = `
  query ($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        total
        currentPage
        lastPage
        hasNextPage
        perPage
      }
      media(type: ANIME, sort: TRENDING_DESC) {
        id
        title {
          romaji
          english
          native
        }
        description
        coverImage {
          large
          medium
        }
        bannerImage
        startDate {
          year
          month
          day
        }
        episodes
        format
        genres
        averageScore
        popularity
        trending
      }
    }
  }
`;

// Query to fetch new releases (currently airing anime)
const NEW_RELEASES_QUERY = `
  query ($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        total
        currentPage
        lastPage
        hasNextPage
        perPage
      }
      media(type: ANIME, status: RELEASING, sort: START_DATE_DESC) {
        id
        title {
          romaji
          english
          native
        }
        description
        coverImage {
          large
          medium
        }
        bannerImage
        startDate {
          year
          month
          day
        }
        episodes
        format
        genres
        averageScore
        popularity
      }
    }
  }
`;

// Query to fetch genres
const GENRES_QUERY = `
  query {
    GenreCollection
  }
`;

// Convert AniList media object to AnimeTrailer format
const convertAniListMediaToAnimeTrailer = (media: any): AnimeTrailer => {
    const currentYear = new Date().getFullYear();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // Determine if it's a new release (released within the last 3 months)
    const startDate = media.startDate?.year
        ? new Date(media.startDate.year, (media.startDate.month || 1) - 1, media.startDate.day || 1)
        : null;

    const isNewRelease = startDate
        ? startDate >= threeMonthsAgo
        : false;

    return {
        id: media.id.toString(),
        title: media.title.english || media.title.romaji || 'Unknown Title',
        description: media.description?.replace(/<[^>]*>/g, '') || 'No description available.',
        shortDescription: media.description
            ? media.description.replace(/<[^>]*>/g, '').substring(0, 100) + '...'
            : 'No description available.',
        thumbnail: media.coverImage?.large || media.coverImage?.medium || IMAGE_PLACEHOLDER,
        backgroundImage: media.bannerImage || media.coverImage?.large || media.coverImage?.medium || IMAGE_PLACEHOLDER,
        videoUrl: undefined, // AniList doesn't provide trailer URLs directly
        year: media.startDate?.year || currentYear,
        rating: media.averageScore ? (media.averageScore / 10).toFixed(1) : 'N/A',
        episodes: media.episodes || 0,
        genres: media.genres?.map((genre: string) => genre.toLowerCase()) || [],
        isNewRelease,
        isTrending: !!media.trending // If trending value exists and is > 0
    };
};

// Fetch anime details by ID
export const fetchAnimeDetailsFromAniList = async (id: string): Promise<AnimeTrailer | null> => {
    try {
        console.log(`Attempting to fetch anime details from AniList for ID: ${id}`);
        const result = await queryAniList(ANIME_BY_ID_QUERY, { id: parseInt(id) });

        if (result.data?.Media) {
            return convertAniListMediaToAnimeTrailer(result.data.Media);
        }
        return null;
    } catch (error) {
        console.error(`Failed to fetch anime details from AniList for ID ${id}:`, error);
        return null;
    }
};

// Search for anime
export const searchAnimeFromAniList = async (query: string, limit = 20): Promise<AnimeTrailer[]> => {
    try {
        console.log(`Searching for anime on AniList: ${query}`);
        const result = await queryAniList(ANIME_SEARCH_QUERY, {
            search: query,
            page: 1,
            perPage: limit,
            sort: ["POPULARITY_DESC"]
        });

        if (result.data?.Page?.media) {
            return result.data.Page.media.map(convertAniListMediaToAnimeTrailer);
        }
        return [];
    } catch (error) {
        console.error('Failed to search anime on AniList:', error);
        return [];
    }
};

// Fetch trending anime
export const fetchTrendingAnimeFromAniList = async (limit = 20): Promise<AnimeTrailer[]> => {
    try {
        console.log('Fetching trending anime from AniList');
        const result = await queryAniList(TRENDING_ANIME_QUERY, { page: 1, perPage: limit });

        if (result.data?.Page?.media) {
            return result.data.Page.media.map(convertAniListMediaToAnimeTrailer);
        }
        return [];
    } catch (error) {
        console.error('Failed to fetch trending anime from AniList:', error);
        return [];
    }
};

// Fetch new releases
export const fetchNewReleasesFromAniList = async (limit = 20): Promise<AnimeTrailer[]> => {
    try {
        console.log('Fetching new releases from AniList');
        const result = await queryAniList(NEW_RELEASES_QUERY, { page: 1, perPage: limit });

        if (result.data?.Page?.media) {
            const animeList = result.data.Page.media.map(convertAniListMediaToAnimeTrailer);
            // Ensure they are marked as new releases
            return animeList.map((anime: AnimeTrailer) => ({ ...anime, isNewRelease: true }));
        }
        return [];
    } catch (error) {
        console.error('Failed to fetch new releases from AniList:', error);
        return [];
    }
};

// Fetch all anime with pagination and filters
export const fetchAllAnimeFromAniList = async (
    page = 1,
    limit = 24,
    sort: SortOption = 'anime_score',
    sortDirection: 'desc' | 'asc' = 'desc',
    genre?: number
): Promise<PaginatedResponse<AnimeTrailer>> => {
    try {
        console.log('Fetching all anime from AniList');

        // Map MyAnimeList sort options to AniList sort options
        const sortMapping: Record<SortOption, string> = {
            'anime_score': 'SCORE',
            'anime_num_list_users': 'POPULARITY',
            'start_date': 'START_DATE',
            'title': 'TITLE_ROMAJI',
            'rank': 'POPULARITY'
        };

        const sortValue = `${sortMapping[sort]}_${sortDirection.toUpperCase()}`;

        // Get genres to filter by if genre ID is provided
        let genreFilter = null;
        if (genre) {
            const genresResult = await queryAniList(GENRES_QUERY);
            const genres = genresResult.data?.GenreCollection || [];
            // Adjust index to match MAL genre IDs with AniList genres
            if (genre > 0 && genre <= genres.length) {
                genreFilter = genres[genre - 1];
            }
        }

        // Custom query with genre filter if needed
        const customQuery = `
      query ($page: Int, $perPage: Int, $sort: [MediaSort], ${genreFilter ? '$genre: String' : ''}) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            total
            currentPage
            lastPage
            hasNextPage
            perPage
          }
          media(type: ANIME, sort: $sort${genreFilter ? ', genre: $genre' : ''}) {
            id
            title {
              romaji
              english
              native
            }
            description
            coverImage {
              large
              medium
            }
            bannerImage
            startDate {
              year
              month
              day
            }
            episodes
            format
            genres
            averageScore
            popularity
          }
        }
      }
    `;

        const variables: any = {
            page,
            perPage: limit,
            sort: [sortValue]
        };

        if (genreFilter) {
            variables.genre = genreFilter;
        }

        const result = await queryAniList(customQuery, variables);

        if (result.data?.Page) {
            const { media, pageInfo } = result.data.Page;
            const animeList = media.map(convertAniListMediaToAnimeTrailer);

            return {
                data: animeList,
                paging: {
                    next: pageInfo.hasNextPage ? `/anime?page=${page + 1}` : undefined
                },
                currentPage: pageInfo.currentPage,
                lastPage: pageInfo.lastPage
            };
        }

        return {
            data: [],
            paging: {},
            currentPage: page,
            lastPage: page
        };
    } catch (error) {
        console.error('Failed to fetch all anime from AniList:', error);
        return {
            data: [],
            paging: {},
            currentPage: page,
            lastPage: page
        };
    }
};

// Fetch genres from AniList
export const fetchGenresFromAniList = async (): Promise<Genre[]> => {
    try {
        console.log('Fetching genres from AniList');
        const result = await queryAniList(GENRES_QUERY);

        if (result.data?.GenreCollection) {
            return result.data.GenreCollection.map((name: string, index: number) => ({
                id: index + 1,
                name
            }));
        }
        return [];
    } catch (error) {
        console.error('Failed to fetch genres from AniList:', error);
        return [];
    }
};

// Export AniList API functions
export const anilistApi = {
    fetchAnimeDetails: fetchAnimeDetailsFromAniList,
    searchAnime: searchAnimeFromAniList,
    fetchTrendingAnime: fetchTrendingAnimeFromAniList,
    fetchNewReleases: fetchNewReleasesFromAniList,
    fetchAllAnime: fetchAllAnimeFromAniList,
    fetchGenres: fetchGenresFromAniList
};

export default anilistApi; 