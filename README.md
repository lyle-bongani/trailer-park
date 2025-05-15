# Trailer Park Anime

Your premier destination for anime trailers and information.

## Features

- Browse trending anime
- Discover new releases
- Search for your favorite anime
- View detailed information and trailers
- Filter anime by genre, year, and more

## API Integrations

This application integrates with multiple anime APIs to ensure reliable data availability:

### 1. MyAnimeList API (Primary)

The application primarily uses the MyAnimeList API to fetch anime data. You'll need to register for a client ID at [MyAnimeList API](https://myanimelist.net/apiconfig).

### 2. AniList API (Secondary)

If the MyAnimeList API is unavailable or returns an error, the application fallbacks to the AniList GraphQL API. No authentication is required for basic queries.

### 3. Kitsu API (Tertiary)

As a third backup option, the application can use the Kitsu API. For authenticated requests, you can register for API credentials at [Kitsu API](https://kitsu.docs.apiary.io/).

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/trailer-park-anime.git
   cd trailer-park-anime
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure the API keys:
   - Copy `.env.example` to `.env`
   - Add your MyAnimeList API client ID
   - (Optional) Add your Kitsu API client ID and secret for enhanced fallback capabilities

4. Start the development server:
   ```bash
   npm start
   ```

## API Fallback System

The application implements a sophisticated fallback system:

1. First attempts to fetch data from MyAnimeList API
2. If that fails, falls back to AniList API
3. If both fail, falls back to Kitsu API
4. If all APIs fail, uses mock data as a last resort

This ensures the application continues to function even if one or more APIs are unavailable.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `REACT_APP_MAL_CLIENT_ID` | Your MyAnimeList API client ID |
| `REACT_APP_KITSU_CLIENT_ID` | Your Kitsu API client ID (optional) |
| `REACT_APP_KITSU_CLIENT_SECRET` | Your Kitsu API client secret (optional) |
| `REACT_APP_API_FALLBACK_ORDER` | Comma-separated list of APIs in fallback order (default: `mal,anilist,kitsu`) |

## Technical Implementation

### API Service Architecture

The application uses Axios for API requests with a layered architecture:

1. **API Services**: Separate service files for each API (`api.ts`, `anilistApi.ts`, `kitsuApi.ts`)
2. **Centralized Configuration**: API keys and endpoints configured in `.env`
3. **Error Handling**: Comprehensive error handling with detailed logging
4. **Fallback Mechanism**: Automated fallback to alternative APIs when primary APIs fail
5. **Data Normalization**: Each API's response is normalized to a common format for consistent usage throughout the app

### Type Safety

The application uses TypeScript to ensure type safety across all API integrations.

## License

MIT
