import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({
    enum: ['ok'],
    example: 'ok',
    description: 'El servidor está disponible.',
  })
  status!: 'ok';
}
