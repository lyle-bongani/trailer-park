/**
 * API Utilities and Examples
 * 
 * This file contains utility functions and examples demonstrating
 * how to use the authenticated API services in your application.
 */

import { getMALAuthToken } from './api';
import kitsuApi from './kitsuApi';
import anilistApi from './anilistApi';

/**
 * Example: How to use MyAnimeList authenticated endpoints
 * 
 * This function demonstrates how to call MyAnimeList authenticated endpoints
 * that require OAuth token authentication.
 * 
 * @param userName MyAnimeList username for user-specific requests
 */
export const getMyAnimeListUserInfo = async (userName: string) => {
    try {
        const token = await getMALAuthToken();
        if (!token) {
            console.error('Could not obtain MyAnimeList authentication token');
            return null;
        }

        // Example of how to make authenticated requests to MyAnimeList
        const response = await fetch(`https://api.myanimelist.net/v2/users/${userName}?fields=anime_statistics`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`MyAnimeList API error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching MyAnimeList user info:', error);
        return null;
    }
};

/**
 * Example: How to use Kitsu authenticated endpoints
 * 
 * This function demonstrates how to call Kitsu API endpoints
 * that might require authentication.
 * 
 * @param userId Kitsu user ID for user-specific requests
 */
export const getKitsuUserLibrary = async (userId: string) => {
    try {
        // Get auth token from Kitsu API
        let token: string;
        try {
            token = await kitsuApi.getAuthToken();
        } catch (authError) {
            console.error('Failed to obtain Kitsu authentication token:', authError);
            return null;
        }

        // Make authenticated request to Kitsu API
        const response = await fetch(`https://kitsu.io/api/edge/users/${userId}/library-entries`, {
            headers: {
                'Accept': 'application/vnd.api+json',
                'Content-Type': 'application/vnd.api+json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Kitsu API error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching Kitsu user library:', error);
        return null;
    }
};

/**
 * Example: How to use AniList GraphQL API with variables
 * 
 * This function demonstrates how to query the AniList GraphQL API
 * with variables for more complex queries.
 * 
 * @param userId AniList user ID
 */
export const getAniListUserStats = async (userId: number) => {
    try {
        const query = `
      query ($userId: Int) {
        User (id: $userId) {
          name
          about
          statistics {
            anime {
              count
              meanScore
              minutesWatched
              episodesWatched
            }
          }
        }
      }
    `;

        const variables = {
            userId
        };

        const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query,
                variables
            }),
        });

        if (!response.ok) {
            throw new Error(`AniList API error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching AniList user stats:', error);
        return null;
    }
};

/**
 * Utility function to determine the best API to use
 * based on the configured fallback order
 */
export const determineBestApi = (): 'mal' | 'anilist' | 'kitsu' => {
    const fallbackOrder = process.env.REACT_APP_API_FALLBACK_ORDER || 'mal,anilist,kitsu';
    const apis = fallbackOrder.split(',');

    // Return the first API in the fallback order
    // This could be extended to check which APIs are working
    return (apis[0] as 'mal' | 'anilist' | 'kitsu') || 'mal';
}; 