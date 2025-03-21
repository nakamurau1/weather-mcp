# Weather MCP Server

A Model Context Protocol (MCP) server that provides weather data from the National Weather Service API.

## Features

- Get weather forecasts by geographic coordinates
- Get weather alerts by US state
- Clean, formatted weather data for LLM consumption
- Integration with Claude and other MCP-compatible clients

## Prerequisites

- Node.js (LTS version recommended)
- npm or yarn

## Installation

1. Clone the repository
```bash
git clone https://github.com/nakamurau1/weather-mcp.git
cd weather-mcp
```

2. Install dependencies
```bash
npm install
```

3. Build the server
```bash
npm run build
```

## Usage

### Running the server directly

```bash
npm start
```

Or directly:

```bash
./dist/index.js
```

### Connecting to Claude Desktop

1. Edit your Claude Desktop configuration file:

```bash
# MacOS
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

2. Add the weather-mcp server configuration:

```json
{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": ["/absolute/path/to/your/weather-mcp/dist/index.js"]
    }
  }
}
```

3. Restart Claude Desktop

4. Test the server with queries like:
   - "What's the weather in Sacramento?"
   - "Are there any active weather alerts in Texas?"

## Available Tools

### get_forecast

Gets weather forecast for a geographic location.

Parameters:
- `latitude`: Latitude of the location (number between -90 and 90)
- `longitude`: Longitude of the location (number between -180 and 180)

### get_alerts

Gets active weather alerts for a US state.

Parameters:
- `state`: Two-letter US state code (e.g., "CA", "NY", "TX")

## Resource Templates

### Weather alerts by state

URI Template: `weather://{state}/alerts`

Example: `weather://CA/alerts`

## Limitations

- Weather data is limited to United States locations (NWS API)
- No historical weather data, only current conditions and forecasts

## Development

- Run in development mode: `npm run dev`
- Build the project: `npm run build`

## License

ISC
