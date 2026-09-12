import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar un usuario' })
  @ApiCreatedResponse({ description: 'Usuario creado sin exponer la contraseña.' })
  @ApiResponse({ status: 409, description: 'El correo ya está registrado.' })
  @ApiResponse({ status: 422, description: 'Datos inválidos.' })
  register(@Body() input: RegisterDto) {
    return this.auth.register(input);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión y obtener JWT' })
  @ApiOkResponse({ description: 'Token JWT emitido.' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas.' })
  @ApiResponse({ status: 422, description: 'Datos inválidos.' })
  login(@Body() input: LoginDto) {
    return this.auth.login(input);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Obtener el usuario autenticado' })
  @ApiResponse({ status: 401, description: 'Token ausente, inválido o vencido.' })
  @ApiResponse({ status: 403, description: 'Sin permiso para el recurso.' })
  me(@Req() request: Request & { user?: { sub: string } }) {
    return this.auth.me(request.user!.sub);
  }
}
