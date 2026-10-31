import type { NestFastifyApplication } from "@nestjs/platform-fastify";

export function configureHttpSecurity(app: NestFastifyApplication): void {
  const allowedOrigins = new Set(
    (process.env.CORS_ALLOWED_ORIGINS ?? "https://srun.ir")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  );
  app.enableCors({
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id", "X-CSRF-Token"],
    exposedHeaders: ["X-Request-Id", "Retry-After"],
    maxAge: 600,
    origin: [...allowedOrigins]
  });
}
