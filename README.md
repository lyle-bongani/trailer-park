# Trailer Park Anime

A modern React application that showcases anime trailers and information powered by the MyAnimeList API.

![Trailer Park Anime](public/images/trailer-park-logo.svg)

## Features

- Browse trending and new anime releases
- Filter anime by genre categories
- View detailed information about each anime
- Responsive design for mobile and desktop
- Modern UI with sleek animations and hover effects
- Custom branding with unique color scheme

## Tech Stack

- React 19
- TypeScript
- Tailwind CSS
- React Router DOM
- MyAnimeList API

## API Configuration

### Setting up MyAnimeList API Access

1. Register for a MyAnimeList account at [MyAnimeList.net](https://myanimelist.net)
2. Visit the [API page](https://myanimelist.net/apiconfig) to register your application
3. Create a new client ID by filling out the form
4. Once approved, you'll receive a Client ID
5. Update the `MAL_CLIENT_ID` constant in `src/services/api.ts` with your Client ID

```javascript
const MAL_CLIENT_ID = 'YOUR_MAL_CLIENT_ID'; // Replace with your client ID from MyAnimeList
```

## Getting Started

In the project directory, you can run:

### `npm install`

Installs all the required dependencies for the project.

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

## Project Structure

- `public/` - Static assets including images and favicon
- `src/` - Application source code
  - `assets/` - SVG and other asset files
  - `services/` - API service for MyAnimeList integration
  - `App.tsx` - Main application component
  - `App.css` - Custom styling

## Credits

This project uses the [MyAnimeList API](https://myanimelist.net/apiconfig) to fetch anime data.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
