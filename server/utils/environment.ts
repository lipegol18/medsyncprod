/**
 * Environment Configuration Helper
 * 
 * Provides flexible environment-based URL generation for different deployment scenarios:
 * - Replit (auto-detection)
 * - Production servers (Hetzner, AWS, etc)
 * - Staging/Homologation
 * - Local development
 * 
 * Configuration Priority:
 * 1. sAPP_PROTOCOL + APP_DOMAIN + APP_PORT (most flexible)
 * 2. REPLIT_DEV_DOMAIN (auto-detected for Replit)
 * 3. localhost:5000 (fallback for development)
 * 
 * Environment Variables:
 * - APP_PROTOCOL: http or https (default: http for dev, https for prod)
 * - APP_DOMAIN: Domain name (e.g., medsync.com.br)
 * - APP_PORT: Port number (optional, defaults to 80 for http, 443 for https)
 * - NODE_ENV: production, staging, development
 * - REPLIT_DEV_DOMAIN: Auto-set by Replit (e.g., your-repl.replit.dev)
 */

interface EnvironmentConfig {
  protocol: 'http' | 'https';
  domain: string;
  port?: number;
  nodeEnv: 'production' | 'staging' | 'development' | 'test';
  isReplit: boolean;
  baseUrl: string;
}

class EnvironmentManager {
  private config: EnvironmentConfig;

  constructor() {
    this.config = this.detectEnvironment();
    this.validateConfig();
    this.logConfiguration();
  }

  /**
   * Detects and builds environment configuration
   */
  private detectEnvironment(): EnvironmentConfig {
    const nodeEnv = (process.env.NODE_ENV || 'development') as EnvironmentConfig['nodeEnv'];
    const isReplit = !!process.env.REPLIT_DEV_DOMAIN;

    // Priority 1: Explicit component configuration
    if (process.env.APP_DOMAIN) {
      const protocol = (process.env.APP_PROTOCOL || 'https') as 'http' | 'https';
      const domain = process.env.APP_DOMAIN;
      const port = process.env.APP_PORT ? parseInt(process.env.APP_PORT) : undefined;

      const baseUrl = this.buildBaseUrl(protocol, domain, port);

      return {
        protocol,
        domain,
        port,
        nodeEnv,
        isReplit: false,
        baseUrl
      };
    }

    // Priority 2: Replit auto-detection
    if (isReplit && process.env.REPLIT_DEV_DOMAIN) {
      const protocol = 'https';
      const domain = process.env.REPLIT_DEV_DOMAIN;
      const baseUrl = `${protocol}://${domain}`;

      return {
        protocol,
        domain,
        port: undefined,
        nodeEnv,
        isReplit: true,
        baseUrl
      };
    }

    // Priority 3: Localhost fallback (development)
    const protocol = 'http';
    const domain = 'localhost';
    const port = 5000;
    const baseUrl = this.buildBaseUrl(protocol, domain, port);

    return {
      protocol,
      domain,
      port,
      nodeEnv,
      isReplit: false,
      baseUrl
    };
  }

  /**
   * Builds base URL from components
   */
  private buildBaseUrl(protocol: 'http' | 'https', domain: string, port?: number): string {
    // Skip port if it's the default for the protocol
    const shouldIncludePort = port && !this.isDefaultPort(protocol, port);
    
    if (shouldIncludePort) {
      return `${protocol}://${domain}:${port}`;
    }
    
    return `${protocol}://${domain}`;
  }

  /**
   * Checks if port is default for protocol
   */
  private isDefaultPort(protocol: 'http' | 'https', port: number): boolean {
    return (protocol === 'http' && port === 80) || (protocol === 'https' && port === 443);
  }

  /**
   * Validates configuration (especially for production)
   */
  private validateConfig(): void {
    const { protocol, nodeEnv, domain } = this.config;

    // Production must use HTTPS - ENFORCE
    if (nodeEnv === 'production' && protocol !== 'https') {
      console.error('❌ ERROR: Production environment MUST use HTTPS protocol!');
      console.error('   Current protocol:', protocol);
      console.error('   Set APP_PROTOCOL=https or ensure HTTPS is configured');
      throw new Error('Invalid production configuration: HTTPS required in production');
    }

    // Production should not use localhost - ENFORCE
    if (nodeEnv === 'production' && domain === 'localhost') {
      console.error('❌ ERROR: Production cannot use localhost as domain!');
      console.error('   Current domain:', domain);
      console.error('   Set APP_DOMAIN to your production domain');
      throw new Error('Invalid production configuration: localhost detected');
    }

    // Staging should use HTTPS - ENFORCE
    if (nodeEnv === 'staging' && protocol !== 'https') {
      console.error('❌ ERROR: Staging environment MUST use HTTPS protocol!');
      console.error('   Current protocol:', protocol);
      console.error('   Set APP_PROTOCOL=https for staging');
      throw new Error('Invalid staging configuration: HTTPS required in staging');
    }

    // Development warning (not enforced)
    if (nodeEnv === 'development' && protocol === 'http') {
      console.log('ℹ️  Development mode using HTTP (this is normal for local development)');
    }
  }

  /**
   * Logs current configuration on startup
   */
  private logConfiguration(): void {
    const { protocol, domain, port, nodeEnv, isReplit, baseUrl } = this.config;

    console.log('\n🌍 Environment Configuration:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📦 Environment: ${nodeEnv}`);
    console.log(`🔗 Protocol: ${protocol}`);
    console.log(`🌐 Domain: ${domain}`);
    console.log(`🔌 Port: ${port || 'default'}`);
    console.log(`🚀 Platform: ${isReplit ? 'Replit' : 'Custom Server'}`);
    console.log(`📍 Base URL: ${baseUrl}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  /**
   * Gets the base URL of the application
   */
  getBaseUrl(): string {
    return this.config.baseUrl;
  }

  /**
   * Builds a full URL for a given path
   */
  getUrl(path: string): string {
    // Remove leading slash if present to avoid double slashes
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${this.config.baseUrl}/${cleanPath}`;
  }

  /**
   * Gets Stripe callback URLs
   */
  getStripeCallbacks() {
    const callbacks = {
      successUrl: this.getUrl('checkout/success?session_id={CHECKOUT_SESSION_ID}'),
      cancelUrl: this.getUrl('checkout/cancel')
    };
    
    console.log('\n🔗 Stripe Callback URLs Geradas:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Success URL:', callbacks.successUrl);
    console.log('✅ Cancel URL:', callbacks.cancelUrl);
    console.log('📍 Base URL usado:', this.config.baseUrl);
    console.log('🌐 Domínio:', this.config.domain);
    console.log('🔒 Protocolo:', this.config.protocol);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return callbacks;
  }

  /**
   * Gets webhook URLs
   */
  getWebhookUrls() {
    return {
      stripe: this.getUrl('api/webhooks/stripe'),
      general: this.getUrl('api/webhooks/general')
    };
  }

  /**
   * Gets current environment info
   */
  getEnvironmentInfo() {
    return {
      ...this.config
    };
  }

  /**
   * Checks if running in production
   */
  isProduction(): boolean {
    return this.config.nodeEnv === 'production';
  }

  /**
   * Checks if running in staging
   */
  isStaging(): boolean {
    return this.config.nodeEnv === 'staging';
  }

  /**
   * Checks if running in development ff
   */
  isDevelopment(): boolean {
    return this.config.nodeEnv === 'development';
  }

  /**
   * Checks if running on Replit f
   */
  isReplitPlatform(): boolean {
    return this.config.isReplit;
  }
}

// Singleton instance
export const environment = new EnvironmentManager();

// Convenience exports
export const getBaseUrl = () => environment.getBaseUrl();
export const getUrl = (path: string) => environment.getUrl(path);
export const getStripeCallbacks = () => environment.getStripeCallbacks();
export const getWebhookUrls = () => environment.getWebhookUrls();
export const isProduction = () => environment.isProduction();
export const isStaging = () => environment.isStaging();
export const isDevelopment = () => environment.isDevelopment();
export const isReplit = () => environment.isReplitPlatform();
