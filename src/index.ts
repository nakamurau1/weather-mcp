#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import axios from 'axios';

// Constants
const NWS_API_BASE = 'https://api.weather.gov';
const USER_AGENT = 'weather-mcp/1.0.0';

// Type definitions for weather data
interface WeatherAlertFeature {
  properties: {
    event?: string;
    areaDesc?: string;
    severity?: string;
    description?: string;
    instruction?: string;
  };
}

interface WeatherForecastPeriod {
  name: string;
  temperature: number;
  temperatureUnit: string;
  windSpeed: string;
  windDirection: string;
  detailedForecast: string;
}

// Zod schemas for input validation
const GetAlertsParamsSchema = z.object({
  state: z.string().length(2, 'State code must be a 2-letter US state code')
});

const GetForecastParamsSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});

/**
 * Weather MCP Server Class
 * Implements an MCP server for NWS weather data
 */
class WeatherServer {
  private server: Server;
  private axiosInstance: ReturnType<typeof axios.create>;

  constructor() {
    // Initialize the MCP server
    this.server = new Server(
      {
        name: 'weather-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    // Initialize axios with default configuration
    this.axiosInstance = axios.create({
      baseURL: NWS_API_BASE,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/geo+json',
      },
    });

    // Set up request handlers
    this.setupResourceHandlers();
    this.setupToolHandlers();

    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);

    // Handle process termination
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  /**
   * Set up resource handlers for the MCP server
   */
  private setupResourceHandlers(): void {
    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'weather://example/current',
          name: 'Current weather example',
          mimeType: 'application/json',
          description: 'Example resource for demonstration purposes',
        },
      ],
    }));

    // List resource templates
    this.server.setRequestHandler(
      ListResourceTemplatesRequestSchema,
      async () => ({
        resourceTemplates: [
          {
            uriTemplate: 'weather://{state}/alerts',
            name: 'Weather alerts for a US state',
            mimeType: 'application/json',
            description: 'Current weather alerts for a specified US state',
          },
        ],
      })
    );

    // Read resource (template or static)
    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        // Extract parameters from URI
        const alertsMatch = request.params.uri.match(
          /^weather:\/\/([A-Z]{2})\/alerts$/i
        );

        if (alertsMatch) {
          const state = alertsMatch[1].toUpperCase();

          try {
            const alertsData = await this.fetchAlerts(state);

            return {
              contents: [
                {
                  uri: request.params.uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(alertsData, null, 2),
                },
              ],
            };
          } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
              throw new McpError(
                ErrorCode.InternalError,
                `Weather API error: ${
                  error.response?.data?.message || error.message
                }`
              );
            }
            throw error;
          }
        }

        throw new McpError(
          ErrorCode.InvalidRequest,
          `Unsupported URI: ${request.params.uri}`
        );
      }
    );
  }

  /**
   * Set up tool handlers for the MCP server
   */
  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'get_alerts',
          description: 'Get weather alerts for a US state',
          inputSchema: {
            type: 'object',
            properties: {
              state: {
                type: 'string',
                description: 'Two-letter US state code (e.g. CA, NY)',
              },
            },
            required: ['state'],
          },
        },
        {
          name: 'get_forecast',
          description: 'Get weather forecast for a location',
          inputSchema: {
            type: 'object',
            properties: {
              latitude: {
                type: 'number',
                description: 'Latitude of the location',
                minimum: -90,
                maximum: 90,
              },
              longitude: {
                type: 'number',
                description: 'Longitude of the location',
                minimum: -180,
                maximum: 180,
              },
            },
            required: ['latitude', 'longitude'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'get_alerts': {
          try {
            // Validate input parameters
            const params = GetAlertsParamsSchema.parse(request.params.arguments);
            const alertData = await this.fetchAlerts(params.state);

            return {
              content: [
                {
                  type: 'text',
                  text: this.formatAlerts(alertData),
                },
              ],
            };
          } catch (error: unknown) {
            if (error instanceof z.ZodError) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `Invalid parameters: ${error.errors.map(e => e.message).join(', ')}`,
                  },
                ],
                isError: true,
              };
            }

            return {
              content: [
                {
                  type: 'text',
                  text: `Error fetching alerts: ${error instanceof Error ? error.message : String(error)}`,
                },
              ],
              isError: true,
            };
          }
        }

        case 'get_forecast': {
          try {
            // Validate input parameters
            const params = GetForecastParamsSchema.parse(request.params.arguments);
            const forecastData = await this.fetchForecast(params.latitude, params.longitude);

            return {
              content: [
                {
                  type: 'text',
                  text: this.formatForecast(forecastData),
                },
              ],
            };
          } catch (error: unknown) {
            if (error instanceof z.ZodError) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `Invalid parameters: ${error.errors.map(e => e.message).join(', ')}`,
                  },
                ],
                isError: true,
              };
            }

            return {
              content: [
                {
                  type: 'text',
                  text: `Error fetching forecast: ${error instanceof Error ? error.message : String(error)}`,
                },
              ],
              isError: true,
            };
          }
        }

        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    });
  }

  /**
   * Fetch weather alerts for a US state
   * @param state Two-letter US state code
   * @returns Formatted alert data
   */
  private async fetchAlerts(state: string): Promise<WeatherAlertFeature[]> {
    const url = `/alerts/active/area/${state}`;

    try {
      const response = await this.axiosInstance.get(url, { timeout: 10000 });
      return response.data.features || [];
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Fetch weather forecast for coordinates
   * @param latitude Latitude coordinate
   * @param longitude Longitude coordinate
   * @returns Formatted forecast data
   */
  private async fetchForecast(latitude: number, longitude: number): Promise<WeatherForecastPeriod[]> {
    // First get the forecast grid endpoint
    const pointsUrl = `/points/${latitude},${longitude}`;

    try {
      const pointsResponse = await this.axiosInstance.get(pointsUrl, { timeout: 10000 });
      const forecastUrl = pointsResponse.data.properties.forecast;

      // Get the forecast data
      const forecastResponse = await this.axiosInstance.get(forecastUrl, { timeout: 10000 });
      return forecastResponse.data.properties.periods || [];
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error('Location not found or not supported');
        }
        throw new Error(`API error: ${error.response?.data?.detail || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Format alerts into readable text
   * @param features Alert features from the API
   * @returns Formatted alert text
   */
  private formatAlerts(features: WeatherAlertFeature[]): string {
    if (features.length === 0) {
      return 'No active weather alerts found for this area.';
    }

    const formattedAlerts = features.map(feature => {
      const props = feature.properties;
      return `
Event: ${props.event || 'Unknown'}
Area: ${props.areaDesc || 'Unknown'}
Severity: ${props.severity || 'Unknown'}
Description: ${props.description || 'No description available'}
Instructions: ${props.instruction || 'No specific instructions provided'}
      `.trim();
    });

    return formattedAlerts.join('\n\n---\n\n');
  }

  /**
   * Format forecast periods into readable text
   * @param periods Forecast periods from the API
   * @returns Formatted forecast text
   */
  private formatForecast(periods: WeatherForecastPeriod[]): string {
    if (periods.length === 0) {
      return 'No forecast data available for this location.';
    }

    const formattedPeriods = periods.slice(0, 5).map(period => {
      return `
${period.name}:
Temperature: ${period.temperature}°${period.temperatureUnit}
Wind: ${period.windSpeed} ${period.windDirection}
Forecast: ${period.detailedForecast}
      `.trim();
    });

    return formattedPeriods.join('\n\n---\n\n');
  }

  /**
   * Run the server with stdio transport
   */
  public async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Weather MCP server running on stdio');
  }
}

// Create and run the server
const server = new WeatherServer();
server.run().catch(error => {
  console.error('Server error:', error);
  process.exit(1);
});
