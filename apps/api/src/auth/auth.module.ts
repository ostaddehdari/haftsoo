import{Module}from"@nestjs/common";import{AuthController}from"./auth.controller";import{AuthProviderGateway}from"./auth-provider";import{AuthService}from"./auth.service";
@Module({controllers:[AuthController],providers:[AuthProviderGateway,AuthService],exports:[AuthService]})export class AuthModule{}
