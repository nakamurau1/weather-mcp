# Weather MCP Server Technical Context

## Core Technologies

### TypeScript
- **Version**: Latest stable (5.x)
- **Purpose**: Primary programming language providing type safety and modern JS features
- **Benefits**: Static typing, better tooling, improved maintainability, and reduced runtime errors

### Model Context Protocol (MCP) SDK
- **Version**: 1.7.0
- **Purpose**: Provides the core framework for building MCP servers
- **Components**:
  - Server implementation
  - Transport layers
  - Tool and resource definitions
  - Request/response handling

### Node.js
- **Version**: Latest LTS (20.x+)
- **Purpose**: JavaScript runtime for executing the server
- **Benefits**: Non-blocking I/O, extensive ecosystem, wide platform support

### Zod
- **Version**: 3.24.2
- **Purpose**: Runtime type validation
- **Benefits**: Ensures data integrity, provides clear error messages for invalid inputs

## External Dependencies

### National Weather Service (NWS) API
- **API Base URL**: https://api.weather.gov
- **Documentation**: https://www.weather.gov/documentation/services-web-api
- **Features**:
  - Forecast data by geographic point
  - Active alerts by area
  - Gridpoint data
- **Authentication**: Requires only a User-Agent header

## Development Setup

### Required Tools
- Node.js (LTS version)
- npm or yarn (package management)
- TypeScript (installed via npm)
- Text editor/IDE with TypeScript support (VS Code recommended)

### Build Process
- TypeScript compilation to JavaScript
- Executable binary creation for CLI usage
- Packaging for distribution

### Environment Requirements
- Environment variables for API keys (if using alternative weather services)
- Network connectivity for API requests
- Permission to use stdio for IPC with clients

## Technical Constraints

### API Limitations
- NWS API is limited to US weather data only
- Rate limiting may apply (recommended to implement retries and backoff)
- API changes may require updates to response handling

### MCP Protocol Constraints
- Communication must follow MCP specification
- Data must be properly formatted for LLM consumption
- Error handling must be comprehensive

### Platform Considerations
- Server should work across Windows, macOS, and Linux
- Path handling should be platform-agnostic
- Environment variable usage should be cross-platform compatible

## Dependencies

```
"dependencies": {
  "@modelcontextprotocol/sdk": "^1.7.0",
  "zod": "^3.24.2"
},
"devDependencies": {
  "@types/node": "^22.13.11",
  "typescript": "^5.8.2"
}
```

## Execution Environment

The server operates as a local process with:
- Standard input/output for MCP communication
- HTTP connections to external weather API
- No persistent storage requirements
- Minimal memory footprint
- Stateless operation between requests
