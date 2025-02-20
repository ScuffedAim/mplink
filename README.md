# MPLink - osu! Match Score Viewer

MPLink is a real-time score viewer for osu! multiplayer matches. It provides a clean and intuitive interface to view match scores, complete with player information, beatmap details, and score statistics.

## Features

- Real-time score updates (refreshes every 5 seconds)
- Detailed score information including:
  - Player names with country flags
  - Score values and accuracy
  - Hit counts (300s/100s/50s/misses)
  - Mod combinations used
  - Maximum combo achieved
- Beatmap information including:
  - Artist and title
  - Difficulty name
  - Cover image
- Automatic grouping of scores by map and time played
- Responsive design with mobile support

## Technical Details

- Built with Next.js 14
- Uses Tailwind CSS for styling
- Integrates with the banchopy API for match data
- Server-side rendering with client-side updates
- TypeScript for type safety

## API Endpoints Used

- `api.scuffedaim.xyz/v2/scores/match/{match_id}` - Match scores
- `api.scuffedaim.xyz/v1/get_map_info` - Beatmap information
- `api.scuffedaim.xyz/v2/players/{user_id}` - Player information

## Usage

1. Navigate to the site
2. Append the match ID to the URL (e.g., `/12345`)
3. View real-time updates of the match scores

## Development
 - npm run dev
 - go to [localhost:3000](http://localhost:3000)