import {get, response} from '@loopback/rest';

export class HealthController {
  @get('/health')
  @response(200, {description: 'Health'})
  health() { return {status: 'ok'}; }
}