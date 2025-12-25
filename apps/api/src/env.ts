import { z } from 'zod';

const EnvSchema = z.object({
  // 服务器配置
  PORT: z.coerce.number().int().positive().default(3000),
  CMS_DATA_DIR: z.string().optional().default(''),
  CMS_AUTO_RESTART_AFTER_SETUP: z.coerce.boolean().optional().default(false),

  // 路由别名配置（安全性增强，仍需配合认证/限流使用）
  CMS_PUBLIC_API_PREFIX: z.string().optional().default('/api/public'),
  CMS_PUBLIC_API_DISABLE_V1: z.coerce.boolean().optional().default(false),
  CMS_ADMIN_API_PREFIX: z.string().optional().default('/admin'),
  CMS_ADMIN_API_DISABLE_DEFAULT: z.coerce.boolean().optional().default(false),

  // 数据库配置（运行时使用）
  MYSQL_HOST: z.string().default('127.0.0.1'),
  MYSQL_PORT: z.coerce.number().int().positive().default(3306),
  MYSQL_DATABASE: z.string().optional().default(''),
  MYSQL_USER: z.string().optional().default(''),
  MYSQL_PASSWORD: z.string().optional().default(''),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  return EnvSchema.parse(process.env);
}

