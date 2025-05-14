export interface Genre {
    id: number;
    name: string;
}

export interface Season {
    year: number;
    season: string;
}

export interface Picture {
    large: string;
    medium: string;
}

export interface Anime {
    id: number;
    title: string;
    main_picture?: Picture;
    alternative_titles?: {
        en?: string;
        ja?: string;
    };
    start_date?: string;
    end_date?: string;
    synopsis?: string;
    mean?: number;
    rank?: number;
    popularity?: number;
    num_list_users?: number;
    num_scoring_users?: number;
    nsfw?: string;
    created_at?: string;
    updated_at?: string;
    media_type?: string;
    status?: string;
    genres?: Genre[];
    num_episodes?: number;
    start_season?: Season;
    broadcast?: {
        day_of_the_week?: string;
        start_time?: string;
    };
    source?: string;
    average_episode_duration?: number;
    rating?: string;
    studios?: {
        id: number;
        name: string;
    }[];

    // Additional fields for our app
    score?: number;
    image_url?: string;
    cover_image?: string;
    trailer_url?: string;
    year?: number;
} 