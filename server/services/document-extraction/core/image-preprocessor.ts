import sharp from "sharp";

export interface PreprocessingOptions {
  removeNoise?: boolean;
  enhanceContrast?: boolean;
  sharpenText?: boolean;
  removeMoire?: boolean;
  targetWidth?: number;
}

export interface PreprocessingResult {
  buffer: Buffer;
  originalSize: { width: number; height: number };
  processedSize: { width: number; height: number };
  appliedOperations: string[];
}

const DEFAULT_OPTIONS: PreprocessingOptions = {
  removeNoise: true,
  enhanceContrast: true,
  sharpenText: true,
  removeMoire: true,
  targetWidth: 2400,
};

export class ImagePreprocessor {
  static async preprocess(
    imageBuffer: Buffer,
    options: PreprocessingOptions = {}
  ): Promise<PreprocessingResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const appliedOperations: string[] = [];

    console.log("🖼️ [ImagePreprocessor] Iniciando pré-processamento...");

    const metadata = await sharp(imageBuffer).metadata();
    const originalSize = {
      width: metadata.width || 0,
      height: metadata.height || 0,
    };

    console.log(`🖼️ [ImagePreprocessor] Tamanho original: ${originalSize.width}x${originalSize.height}`);

    let pipeline = sharp(imageBuffer);

    if (opts.targetWidth && originalSize.width < opts.targetWidth) {
      pipeline = pipeline.resize(opts.targetWidth, null, {
        withoutEnlargement: false,
        kernel: sharp.kernel.lanczos3,
      });
      appliedOperations.push(`upscale_to_${opts.targetWidth}px`);
      console.log(`🖼️ [ImagePreprocessor] Upscale para ${opts.targetWidth}px de largura`);
    }

    pipeline = pipeline.grayscale();
    appliedOperations.push("grayscale");
    console.log("🖼️ [ImagePreprocessor] Convertido para escala de cinza");

    if (opts.enhanceContrast) {
      pipeline = pipeline.normalize();
      appliedOperations.push("normalize_contrast");
      console.log("🖼️ [ImagePreprocessor] Contraste normalizado");
    }

    if (opts.removeMoire) {
      pipeline = pipeline.median(3);
      appliedOperations.push("median_filter_3x3");
      console.log("🖼️ [ImagePreprocessor] Filtro mediano aplicado (remove Moiré)");
    }

    if (opts.sharpenText) {
      pipeline = pipeline.sharpen({
        sigma: 1.2,
        m1: 1.0,
        m2: 0.5,
      });
      appliedOperations.push("sharpen_text");
      console.log("🖼️ [ImagePreprocessor] Nitidez aplicada");
    }

    if (opts.removeNoise) {
      pipeline = pipeline.blur(0.3);
      appliedOperations.push("light_blur_denoise");
      console.log("🖼️ [ImagePreprocessor] Ruído reduzido");
    }

    const processedBuffer = await pipeline.png().toBuffer();

    const processedMetadata = await sharp(processedBuffer).metadata();
    const processedSize = {
      width: processedMetadata.width || 0,
      height: processedMetadata.height || 0,
    };

    console.log(`🖼️ [ImagePreprocessor] Tamanho final: ${processedSize.width}x${processedSize.height}`);
    console.log(`🖼️ [ImagePreprocessor] Operações aplicadas: ${appliedOperations.join(", ")}`);

    return {
      buffer: processedBuffer,
      originalSize,
      processedSize,
      appliedOperations,
    };
  }

  static async preprocessForScreenPhoto(imageBuffer: Buffer): Promise<PreprocessingResult> {
    console.log("📸 [ImagePreprocessor] Modo especial: foto de tela de computador");

    const metadata = await sharp(imageBuffer).metadata();
    const originalSize = {
      width: metadata.width || 0,
      height: metadata.height || 0,
    };

    const appliedOperations: string[] = [];

    let pipeline = sharp(imageBuffer);

    const targetWidth = Math.max(2400, originalSize.width);
    if (originalSize.width < targetWidth) {
      pipeline = pipeline.resize(targetWidth, null, {
        withoutEnlargement: false,
        kernel: sharp.kernel.lanczos3,
      });
      appliedOperations.push(`upscale_to_${targetWidth}px`);
    }

    pipeline = pipeline.grayscale();
    appliedOperations.push("grayscale");

    pipeline = pipeline.normalize();
    appliedOperations.push("normalize_contrast");

    pipeline = pipeline.median(5);
    appliedOperations.push("median_filter_5x5_moire_removal");
    console.log("📸 [ImagePreprocessor] Filtro mediano 5x5 (agressivo para Moiré)");

    pipeline = pipeline.sharpen({
      sigma: 1.5,
      m1: 1.2,
      m2: 0.7,
    });
    appliedOperations.push("sharpen_aggressive");

    pipeline = pipeline.modulate({
      brightness: 1.05,
    });
    appliedOperations.push("brightness_boost");

    const processedBuffer = await pipeline.png().toBuffer();

    const processedMetadata = await sharp(processedBuffer).metadata();
    const processedSize = {
      width: processedMetadata.width || 0,
      height: processedMetadata.height || 0,
    };

    console.log(`📸 [ImagePreprocessor] Pré-processamento de tela concluído`);
    console.log(`📸 [ImagePreprocessor] ${originalSize.width}x${originalSize.height} → ${processedSize.width}x${processedSize.height}`);

    return {
      buffer: processedBuffer,
      originalSize,
      processedSize,
      appliedOperations,
    };
  }

  static async detectIfScreenPhoto(imageBuffer: Buffer): Promise<boolean> {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      
      if (metadata.width && metadata.height) {
        const aspectRatio = metadata.width / metadata.height;
        if (aspectRatio > 1.2 && aspectRatio < 2.0) {
          console.log("📸 [ImagePreprocessor] Aspecto de tela detectado (16:9 ou similar)");
          return true;
        }
      }

      const stats = await sharp(imageBuffer)
        .grayscale()
        .stats();

      if (stats.channels[0]) {
        const stdDev = stats.channels[0].stdev;
        if (stdDev > 60) {
          console.log(`📸 [ImagePreprocessor] Alta variação de luminância (${stdDev.toFixed(1)}) - possível foto de tela`);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error("❌ [ImagePreprocessor] Erro ao detectar tipo de foto:", error);
      return false;
    }
  }
}
