import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOkResponse({ description: 'API health status' })
  check() {
    return {
      success: true,
      message: 'Codex Shop API is healthy',
      timestamp: new Date().toISOString(),
    };
  }
}

